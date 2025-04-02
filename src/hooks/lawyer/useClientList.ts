import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/client';
import { useAuth } from '@/contexts/AuthContext';

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
        console.log('Fetching clients for lawyer ID:', user.id);

        // First, try the simplified query without the nested join to profiles
        const { data: lawyerClients, error: lawyerClientsError } = await supabase
          .from('lawyer_clients')
          .select(`
            client_id,
            clients!lawyer_clients_client_id_fkey (
              id,
              client_id,
              email,
              phone,
              photo_url,
              role,
              status,
              id_number,
              created_at
            )
          `)
          .eq('lawyer_id', user.id)
          .eq('status', 'active');

        if (lawyerClientsError) {
          console.error('Error fetching lawyer clients:', lawyerClientsError);
          throw lawyerClientsError;
        }

        console.log('Lawyer clients fetched:', lawyerClients?.length || 0);

        // Now fetch profiles separately if needed
        const clientIds = lawyerClients.map(lc => (lc.clients as any)?.id).filter(Boolean);
        let profilesData: Record<string, any> = {};
        
        if (clientIds.length > 0) {
          try {
            // Try to fetch profiles for these clients
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id,user_id,first_name,last_name')
              .in('user_id', clientIds)
              .returns<{ id: string; user_id: string; first_name: string | null; last_name: string | null }[]>();
              
            if (!profilesError && profiles) {
              // Create a lookup map of profiles by id
              profilesData = profiles.reduce((acc, profile) => {
                acc[profile.user_id] = profile;
                return acc;
              }, {} as Record<string, any>);
              
              console.log('Profiles fetched:', profiles.length);
            } else {
              console.warn('Could not fetch profiles:', profilesError);
            }
          } catch (profileErr) {
            console.warn('Error fetching profiles:', profileErr);
            // Continue without profiles data
          }
        }

        const formattedClients = lawyerClients.map(lc => {
          const client = lc.clients as any;
          const profile = profilesData[client.id] || {};
          
          return {
            id: client.id,
            client_id: client.client_id,
            email: client.email,
            phone: client.phone,
            photo_url: client.photo_url,
            role: client.role,
            status: client.status,
            id_number: client.id_number,
            created_at: client.created_at,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null
          };
        });

        console.log('Formatted clients:', formattedClients.length);
        setClients(formattedClients);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user]);

  return { clients, isLoading, error };
} 