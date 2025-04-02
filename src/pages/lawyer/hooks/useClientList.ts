
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Client } from '@/types/client';

export function useClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchClients = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // First, get all client IDs for this lawyer
        const { data: lawyerClients, error: lawyerClientsError } = await supabase
          .from('lawyer_clients')
          .select('client_id')
          .eq('lawyer_id', user.id)
          .eq('status', 'active');

        if (lawyerClientsError) throw lawyerClientsError;

        const clientIds = lawyerClients.map(lc => lc.client_id);

        if (clientIds.length === 0) {
          setClients([]);
          return;
        }

        // Fetch all clients data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (clientError) throw clientError;

        // Create a list of formatted clients with initial data
        const formattedClients: Client[] = clientData.map(client => ({
          id: client.id,
          client_id: client.client_id,
          email: client.email,
          phone: client.phone,
          photo_url: client.photo_url,
          role: client.role,
          status: client.status,
          id_number: client.id_number,
          created_at: client.created_at,
          first_name: null,
          last_name: null,
          user_id: null
        }));

        setClients(formattedClients);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user]);

  return { clients, isLoading, error };
}
