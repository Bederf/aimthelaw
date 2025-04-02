import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  client_id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  id_number?: string;
  photo_url?: string;
  status?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export function useClient() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch client base data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select(`
            id,
            client_id,
            email,
            phone,
            photo_url,
            status,
            id_number,
            created_at,
            metadata
          `)
          .eq('id', clientId)
          .single();
        
        if (clientError) {
          throw clientError;
        }

        // Fetch profile data for additional fields
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, address')
          .eq('user_id', clientId)
          .maybeSingle();

        if (profileError) {
          console.warn(`Could not fetch profile data for client ${clientId}:`, profileError);
          // Continue with just the client data
        }

        // Combine client and profile data
        setClient({ 
          ...clientData, 
          first_name: profileData?.first_name || null, 
          last_name: profileData?.last_name || null,
          address: profileData?.address || null
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Failed to load client data');
        setClient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  return { client, loading, error, clientId };
} 