-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade,
  user_id text not null,  -- This will store LAW_SNOW_801010, CL_DOE_771212, etc.
  first_name text,
  last_name text,
  role text check (role in ('admin', 'lawyer', 'client')),
  created_at timestamptz default now(),
  primary key (id)
);

-- Drop the incorrect foreign key if it exists
do $$ 
begin
  if exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'profiles_lawyer_fk'
  ) then
    alter table public.profiles drop constraint profiles_lawyer_fk;
  end if;
end $$;

-- Create lawyers table if not exists
create table if not exists public.lawyers (
  id uuid not null,
  lawyer_id text not null,  -- This will store LAW_SNOW_801010
  email text not null,
  id_number text not null,
  phone text,
  status text default 'active',
  created_at timestamptz default now(),
  primary key (id)
);

-- Create admins table
create table if not exists public.admins (
  id uuid not null,
  admin_id uuid references auth.users on delete cascade,
  email text not null,
  id_number text not null,
  phone text,
  address_line1 text,
  city text,
  postal_code text,
  status text default 'active',
  created_at timestamptz default now(),
  primary key (id)
);

-- Create RLS policies
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.lawyers enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Admins policies
create policy "Admins are viewable by authenticated users"
  on admins for select
  using ( auth.role() = 'authenticated' );

create policy "Only admins can insert other admins"
  on admins for insert
  using ( auth.uid() in ( select admin_id from admins ) );

create policy "Only admins can update admin records"
  on admins for update
  using ( auth.uid() in ( select admin_id from admins ) );

-- Add new policy for self-lookup
create policy "Users can view their own admin record"
  on admins for select
  using ( auth.uid() = id );

-- Lawyer policies
create policy "Lawyers can view own data"
  on lawyers for select
  using ( auth.uid() = id );

create policy "Admins can view all lawyers"
  on lawyers for select
  using ( 
    auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Add new policy for authentication lookup
create policy "Authenticated users can check lawyer status"
  on lawyers for select
  using ( auth.role() = 'authenticated' );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
declare
  role_type text;
  display_id text;
begin
  -- Get the display ID (LAW_SNOW_801010, etc.) from metadata
  display_id := new.raw_user_meta_data->>'user_id';
  
  -- Extract role from display_id prefix
  case substring(display_id from 1 for 3)
    when 'LAW' then role_type := 'lawyer'
    when 'ADM' then role_type := 'admin'
    when 'CL_' then role_type := 'client'
    else role_type := 'client' -- default to client if no match
  end case;

  -- Create profile
  insert into public.profiles (id, user_id, first_name, last_name, role)
  values (
    new.id,
    display_id,  -- Store the LAW_SNOW_801010 format ID
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    role_type
  );

  -- If this is a lawyer, also create lawyer record
  if role_type = 'lawyer' then
    insert into public.lawyers (id, lawyer_id, email)
    values (
      new.id,
      display_id,
      new.email
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on lawyer_clients table
alter table public.lawyer_clients enable row level security;

-- Lawyer-client relationship policies
create policy "Lawyers can view their client relationships"
  on lawyer_clients for select
  using ( auth.uid() = lawyer_id );

create policy "Clients can view their lawyer relationships"
  on lawyer_clients for select
  using ( auth.uid() = client_id );

create policy "Lawyers can create client relationships"
  on lawyer_clients for insert
  with check (
    auth.uid() in (
      select id 
      from lawyers 
      where status = 'active'
    )
  );

create policy "Lawyers can update their client relationships"
  on lawyer_clients for update
  using ( auth.uid() = lawyer_id );

-- Create token_usage table
create table if not exists public.token_usage (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references auth.users on delete cascade,
  tokens_used integer not null,
  cost decimal(10,4) not null,
  model text not null,
  service text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  timestamp timestamptz default now()
);

-- Create token_costs table for rate management
create table if not exists public.token_costs (
  id uuid default uuid_generate_v4() primary key,
  rate decimal(10,4) not null,
  created_at timestamptz default now(),
  model text not null
);

-- Create token_balances table for client balances
create table if not exists public.token_balances (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references auth.users on delete cascade,
  tokens_used integer not null default 0,
  cost decimal(10,4) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  balance decimal(10,4) not null default 0
);

-- Create token_transactions table for tracking balance changes
create table if not exists public.token_transactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references auth.users on delete cascade,
  amount decimal(10,4) not null,
  transaction_type text not null check (transaction_type in ('credit', 'debit')),
  description text,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS on token tables
alter table public.token_usage enable row level security;
alter table public.token_costs enable row level security;
alter table public.token_balances enable row level security;
alter table public.token_transactions enable row level security;

-- Token usage policies
create policy "Users can view their own token usage"
  on token_usage for select
  using ( auth.uid() = client_id );

create policy "Lawyers can view their clients' token usage"
  on token_usage for select
  using (
    auth.uid() in (
      select lawyer_id
      from lawyer_clients
      where client_id = token_usage.client_id
    )
  );

create policy "Admins can view all token usage"
  on token_usage for select
  using (
    auth.uid() in (
      select id
      from profiles
      where role = 'admin'
    )
  );

create policy "System can insert token usage"
  on token_usage for insert
  with check ( true );

-- Token costs policies
create policy "Anyone can view token costs"
  on token_costs for select
  using ( true );

create policy "Only admins can update token costs"
  on token_costs for insert
  with check (
    auth.uid() in (
      select id
      from profiles
      where role = 'admin'
    )
  );

-- Token balances policies
create policy "Users can view their own token balance"
  on token_balances for select
  using ( auth.uid() = client_id );

create policy "Lawyers can view their clients' token balances"
  on token_balances for select
  using (
    auth.uid() in (
      select lawyer_id
      from lawyer_clients
      where client_id = token_balances.client_id
    )
  );

create policy "Admins can view all token balances"
  on token_balances for select
  using (
    auth.uid() in (
      select id
      from profiles
      where role = 'admin'
    )
  );

create policy "System can update token balances"
  on token_balances for all
  using ( true );

-- Token transactions policies
create policy "Users can view their own transactions"
  on token_transactions for select
  using ( auth.uid() = client_id );

create policy "Lawyers can view their clients' transactions"
  on token_transactions for select
  using (
    auth.uid() in (
      select lawyer_id
      from lawyer_clients
      where client_id = token_transactions.client_id
    )
  );

create policy "Admins can view all transactions"
  on token_transactions for select
  using (
    auth.uid() in (
      select id
      from profiles
      where role = 'admin'
    )
  );

create policy "System can insert transactions"
  on token_transactions for insert
  with check ( true );
