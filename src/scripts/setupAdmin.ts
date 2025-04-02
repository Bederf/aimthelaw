import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://weujfmfubskndhvokixy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldWpmbWZ1YnNrbmRodm9raXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjg5NDAsImV4cCI6MjAyMzkwNDk0MH0.SbUPHf5oEYz1YjZfZoNKYGKR1fXfCZ0Yq1hp-o7QFvg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupAdmin() {
  try {
    // Add to profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: 'b7c7a701-eb34-4152-a3a1-6e13610dc22c',
        user_id: 'ADM_VANROOYEN_230221',
        first_name: 'Pieter',
        last_name: 'vanRooyen',
        role: 'admin'
      }]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    // Add to admins table
    const { error: adminError } = await supabase
      .from('admins')
      .insert([{
        id: 'b7c7a701-eb34-4152-a3a1-6e13610dc22c',
        admin_id: 'b7c7a701-eb34-4152-a3a1-6e13610dc22c',
        email: 'bederf@gmail.com',
        id_number: 'ADM001',
        status: 'active'
      }]);

    if (adminError) {
      console.error('Error creating admin:', adminError);
      return;
    }

    console.log('Admin user setup completed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

setupAdmin(); 