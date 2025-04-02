export interface ClientFile {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  processing_cost: number;
}

export interface DocumentCategory {
  category: string;
  subcategory?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}

export interface Client {
  id: string;
  client_id: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: 'client' | 'lawyer' | 'admin';
  status: string | null;
  id_number: string;
  created_at: string | null;
}

export interface ClientInsert {
  id: string;
  client_id?: string;
  email: string;
  phone?: string | null;
  photo_url?: string | null;
  role: 'client';  // Required and fixed to 'client'
  status?: string | null;
  id_number: string;
  created_at?: string;
}

export interface ClientUpdate {
  id?: string;
  client_id?: string;
  email?: string;
  phone?: string | null;
  photo_url?: string | null;
  role?: 'client';  // Optional but can only be 'client'
  status?: string | null;
  id_number?: string;
  created_at?: string;
}

export interface ClientWithProfile extends Client {
  profiles: Profile;
}

export interface LawyerClientData {
  client_id: string;
  client: ClientWithProfile;
}
