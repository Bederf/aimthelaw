
export interface Client {
  id: string;
  client_id: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: string;
  status: string | null;
  id_number: string;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  lawyer_id: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  avatar_url: string | null;
}
