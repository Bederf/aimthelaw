-- Enable RLS on tables
alter table public.clients enable row level security;
alter table public.lawyer_clients enable row level security;

-- Clients policies
create policy "Clients can view own data"
  on clients for select
  using ( auth.uid() = id );

create policy "Lawyers can view their clients' data"
  on clients for select
  using ( 
    auth.uid() in (
      select lawyer_id 
      from lawyer_clients 
      where client_id = id 
      and status = 'active'
    )
  );

create policy "Lawyers can create clients"
  on clients for insert
  with check (
    auth.uid() in (
      select id 
      from lawyers 
      where status = 'active'
    )
  );

create policy "Clients can update own data"
  on clients for update
  using ( auth.uid() = id );

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