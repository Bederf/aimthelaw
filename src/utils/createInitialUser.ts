
import { supabase } from "@/integrations/supabase/client";

export const createInitialAdminUser = async () => {
  try {
    // Step 1: Create the user in Auth
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

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user data returned');
    }

    // Step 2: Create admin entry (profile will be created by trigger)
    const { error: adminError } = await supabase
      .from('admins')
      .insert([
        {
          id: authData.user.id,
          admin_id: authData.user.id,
          email: 'bederf@gmail.com',
          id_number: authData.user.id.substring(0, 8),
          status: 'active'
        }
      ]);

    if (adminError) {
      console.error('Error creating admin entry:', adminError);
      throw adminError;
    }

    // Step 3: Update profile role to admin
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile role:', profileError);
      throw profileError;
    }

    console.log('Admin user created successfully');
    return authData.user;
  } catch (error) {
    console.error('Error in user creation process:', error);
    throw error;
  }
};

// Only execute if this file is run directly
if (require.main === module) {
  createInitialAdminUser()
    .then(() => {
      console.log('Admin user creation completed');
    })
    .catch((error) => {
      console.error('Failed to create admin user:', error);
    });
}
