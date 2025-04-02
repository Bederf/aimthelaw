import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { ClientFormData } from '../types/client';
import { useAuth } from "@/contexts/AuthContext";

export const useCreateClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadPhoto = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    
    const { error: createBucketError } = await supabase.storage
      .createBucket('client-photos', { public: true });
    
    if (createBucketError && !createBucketError.message.includes('already exists')) {
      throw createBucketError;
    }

    const { error: uploadError } = await supabase.storage
      .from('client-photos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;
    return fileName;
  };

  const createClient = async (formData: ClientFormData, photoFile: File | null) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a client",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setIsLoading(true);

      // Check if email already exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingClient) {
        toast({
          title: "Error",
          description: "A client with this email already exists",
          variant: "destructive",
        });
        return;
      }

      // Check if ID number already exists
      const { data: existingIdNumber } = await supabase
        .from('clients')
        .select('id')
        .eq('id_number', formData.id_number)
        .single();

      if (existingIdNumber) {
        toast({
          title: "Error",
          description: "A client with this ID number already exists",
          variant: "destructive",
        });
        return;
      }

      const { data: lawyerData, error: lawyerError } = await supabase
        .from('lawyers')
        .select('id, status')
        .eq('id', user.id)
        .single();

      if (lawyerError || !lawyerData || lawyerData.status !== 'active') {
        toast({
          title: "Error",
          description: "You don't have permission to create clients",
          variant: "destructive",
        });
        return;
      }

      // Create auth user first with admin key
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: `${formData.lastName.toUpperCase()}_${formData.id_number.substring(0, 6)}`,
        email_confirm: true,
        user_metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      });

      if (authError || !authData.user) {
        toast({
          title: "Error",
          description: authError?.message || "No user data returned",
          variant: "destructive",
        });
        return;
      }

      let photoUrl = null;
      if (photoFile) {
        try {
          const fileName = await uploadPhoto(authData.user.id, photoFile);
          const { data: { publicUrl } } = supabase.storage
            .from('client-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          toast({
            title: "Warning",
            description: "Failed to upload photo, but continuing with client creation",
          });
        }
      }

      // Get the generated client ID
      const { data: clientIdData, error: clientIdError } = await supabase
        .rpc('generate_client_id', {
          p_surname: formData.lastName,
          p_id_number: formData.id_number
        });

      if (clientIdError) {
        console.error('Error generating client ID:', clientIdError);
        toast({
          title: "Error",
          description: "Failed to generate client ID",
          variant: "destructive",
        });
        return;
      }

      // Create client record
      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          id: authData.user.id,
          client_id: clientIdData,
          email: formData.email,
          id_number: formData.id_number,
          role: 'client',
          phone: formData.phone || null,
          status: 'active',
          photo_url: photoUrl
        }]);

      if (clientError) {
        console.error('Client creation error:', clientError);
        toast({
          title: "Error",
          description: "Failed to create client record",
          variant: "destructive",
        });
        return;
      }

      // Create lawyer-client relationship
      const { error: linkError } = await supabase
        .from('lawyer_clients')
        .insert([{
          lawyer_id: user.id,
          client_id: authData.user.id,
          status: 'active'
        }]);

      if (linkError) {
        console.error('Link error:', linkError);
        toast({
          title: "Error",
          description: "Failed to link client to lawyer",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Client account created successfully. Initial password is: ${formData.lastName.toUpperCase()}_${formData.id_number.substring(0, 6)}`,
      });

      navigate('/lawyer/clients');
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create client account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createClient,
  };
};
