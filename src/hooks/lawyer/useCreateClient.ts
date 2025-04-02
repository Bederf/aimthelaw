import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import type { ClientFormData } from '@/types/lawyer/client';
import type { Database } from '@/integrations/supabase/types';
import { v4 as uuidv4 } from 'uuid';

export function useCreateClient() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const generateClientId = (lastName: string, idNumber: string): string => {
    const formattedSurname = lastName.toUpperCase();
    const idPrefix = idNumber.substring(0, 6);
    return `CLI_${formattedSurname}_${idPrefix}`;
  };

  const verifyLawyerStatus = async (lawyerId: string): Promise<boolean> => {
    const { data: lawyer, error } = await supabase
      .from('lawyers')
      .select('status')
      .eq('id', lawyerId)
      .single();

    if (error || !lawyer) {
      console.error('Error verifying lawyer status:', error);
      return false;
    }

    return lawyer.status === 'active';
  };

  const checkDuplicates = async (email: string, idNumber: string): Promise<string | null> => {
    // Check email duplicate
    const { data: emailExists } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .single();

    if (emailExists) {
      return 'A client with this email already exists';
    }

    // Check ID number duplicate
    const { data: idExists } = await supabase
      .from('clients')
      .select('id')
      .eq('id_number', idNumber)
      .single();

    if (idExists) {
      return 'A client with this ID number already exists';
    }

    return null;
  };

  const uploadPhoto = async (userId: string, file: File): Promise<string | null> => {
    try {
      // Check if bucket exists and create if it doesn't
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket('client-photos');

      if (bucketError && bucketError.message.includes('does not exist')) {
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('client-photos', { public: false });

        if (createBucketError) throw createBucketError;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const createClient = async (formData: ClientFormData, photoFile: File | null) => {
    if (!user) {
      toast.error("You must be logged in to create a client");
      return;
    }

    try {
      setIsLoading(true);

      // 1. Verify lawyer status
      const isActiveLawyer = await verifyLawyerStatus(user.id);
      if (!isActiveLawyer) {
        throw new Error('Only active lawyers can create clients');
      }

      // 2. Check for duplicates
      const duplicateError = await checkDuplicates(formData.email, formData.id_number);
      if (duplicateError) {
        throw new Error(duplicateError);
      }

      // 3. Generate IDs
      const clientUuid = uuidv4(); // Generate a proper UUID
      const displayClientId = generateClientId(formData.lastName, formData.id_number);

      // 4. Handle photo upload if provided
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(displayClientId, photoFile);
      }

      // 5. Create client record
      const clientData: Database['public']['Tables']['clients']['Insert'] = {
        id: clientUuid,
        client_id: displayClientId,
        email: formData.email,
        id_number: formData.id_number,
        phone: formData.phone || null,
        status: 'active',
        role: 'client',
        photo_url: photoUrl
      };

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientError) {
        throw clientError;
      }

      // Create lawyer-client relationship
      const { error: relationError } = await supabase
        .from('lawyer_clients')
        .insert([{
          lawyer_id: user.id,
          client_id: clientUuid, // Use the UUID here, not the display ID
          status: 'active',
          created_at: new Date().toISOString()
        }]);

      if (relationError) {
        // Cleanup if relationship creation fails
        await supabase.from('clients').delete().eq('id', clientUuid);
        throw relationError;
      }

      // Success!
      toast.success("Client created successfully");
      return newClient;
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(`Error creating client: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { createClient, isLoading };
} 