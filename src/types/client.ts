export interface Client {
  id: string;
  client_id: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: 'client' | 'lawyer' | 'admin';
  status: string;
  id_number: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
}
