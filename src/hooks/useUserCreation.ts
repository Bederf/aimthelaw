import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useUserCreation = (setEmail: (email: string) => void, setPassword: (password: string) => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createInitialAdmin = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'bederf@gmail.com',
        password: 'pieter123',
        options: {
          data: {
            first_name: 'Pieter',
            last_name: 'vanRooyen'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      // Generate admin ID
      const adminId = `ADM_VANROOYEN_${authData.user.id.substring(0, 6)}`;

      // Create initial profile record
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: adminId,
          user_id: adminId,
          first_name: 'Pieter',
          last_name: 'vanRooyen',
          email: 'bederf@gmail.com',
          role: 'admin'
        }]);

      if (createProfileError) throw createProfileError;

      const { error: adminError } = await supabase
        .from('admins')
        .insert([{
          id: adminId,
          admin_id: adminId,
          email: 'bederf@gmail.com',
          id_number: authData.user.id.substring(0, 8),
          status: 'active'
        }]);

      if (adminError) throw adminError;

      toast({
        title: "Success",
        description: "Admin user created successfully. You can now log in.",
      });

      setEmail('bederf@gmail.com');
      setPassword('pieter123');

    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLawyer = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'lawyer@example.com',
        password: 'lawyer123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      // Generate lawyer ID
      const lawyerId = `LAW_DOE_${authData.user.id.substring(0, 6)}`;

      // Create initial profile record
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: lawyerId,
          user_id: lawyerId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'lawyer@example.com',
          role: 'lawyer'
        }]);

      if (createProfileError) throw createProfileError;

      const { error: lawyerError } = await supabase
        .from('lawyers')
        .insert([{
          id: lawyerId,
          lawyer_id: lawyerId,
          email: 'lawyer@example.com',
          id_number: lawyerId.substring(0, 8),
          role: 'lawyer',
          status: 'active'
        }]);

      if (lawyerError) throw lawyerError;

      toast({
        title: "Success",
        description: "Lawyer account created successfully. You can now log in.",
      });

      setEmail('lawyer@example.com');
      setPassword('lawyer123');

    } catch (error: any) {
      console.error('Error creating lawyer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lawyer user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createInitialAdmin,
    createLawyer
  };
};
