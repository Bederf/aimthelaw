import { supabase } from "@/integrations/supabase/client";

interface CreateClientData {
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  auth: {
    email: string;
    password: string;
    options: {
      data: {
        user_type: string;
        user_id: string;
      }
    }
  }
}

export const clientService = {
  async createClient(data: CreateClientData) {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.auth.email,
        password: data.auth.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            role: 'client'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          email: data.email,
          id_number: data.id_number,
          phone: data.phone,
          role: 'client',
          client_id: authData.user.id,
          id: authData.user.id
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      return { data: clientData, error: null };
    } catch (error) {
      console.error('Error in createClient:', error);
      return { data: null, error };
    }
  }
};
