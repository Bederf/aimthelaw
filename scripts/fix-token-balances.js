// Script to fix duplicate token balance records in Supabase
// Usage: node fix-token-balances.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or service role key not found in environment variables.');
  console.error('Make sure you have a .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseKey);

// Load the SQL script
const sqlScript = fs.readFileSync(
  path.resolve(__dirname, '../supabase/sql/fix_token_balances.sql'),
  'utf8'
);

async function fixTokenBalances() {
  console.log('Starting token balances fix...');
  
  try {
    // First, check for duplicates
    const { data: duplicates, error: checkError } = await supabase.rpc('check_token_balance_duplicates');
    
    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
      
      // Create the function if it doesn't exist
      await supabase.rpc('create_check_duplicates_function');
      
      // Try again
      const { data: retryDuplicates, error: retryError } = await supabase.rpc('check_token_balance_duplicates');
      
      if (retryError) {
        console.error('Error creating check function:', retryError);
        console.log('Falling back to direct SQL execution...');
      } else {
        console.log(`Found ${retryDuplicates.length} clients with duplicate records.`);
      }
    } else {
      console.log(`Found ${duplicates.length} clients with duplicate records.`);
    }
    
    // Execute the SQL script
    const { error } = await supabase.rpc('run_sql', { sql: sqlScript });
    
    if (error) {
      console.error('Error executing SQL script:', error);
      return;
    }
    
    console.log('Token balances fix completed successfully!');
    
    // Verify the fix
    const { data: verifyDuplicates, error: verifyError } = await supabase.rpc('check_token_balance_duplicates');
    
    if (verifyError) {
      console.error('Error verifying fix:', verifyError);
    } else {
      console.log(`Verification: ${verifyDuplicates.length} clients with duplicate records remaining.`);
      if (verifyDuplicates.length === 0) {
        console.log('All duplicates have been fixed!');
      } else {
        console.log('Some duplicates remain. Please check the database manually.');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixTokenBalances()
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 