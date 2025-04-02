// Script to inspect database tables and structure
// Usage: node inspect-database.js

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
  path.resolve(__dirname, '../supabase/sql/inspect_all_tables.sql'),
  'utf8'
);

// Split the script into individual queries
const queries = sqlScript
  .split(';')
  .map(query => query.trim())
  .filter(query => query && !query.startsWith('--'));

async function inspectDatabase() {
  console.log('Starting database inspection...');
  console.log('='.repeat(80));
  
  const outputFile = path.resolve(__dirname, '../database_inspection_results.md');
  let output = '# Database Inspection Results\n\n';
  output += `Inspection date: ${new Date().toISOString()}\n\n`;
  
  try {
    // Execute each query and log the results
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // Extract the comment above the query to use as a section title
      const queryLines = sqlScript.split('\n');
      let commentLine = '';
      
      for (let j = 0; j < queryLines.length; j++) {
        if (queryLines[j].includes(query.substring(0, 20))) {
          // Look for the nearest comment line above
          for (let k = j - 1; k >= 0; k--) {
            if (queryLines[k].trim().startsWith('--')) {
              commentLine = queryLines[k].trim().replace('--', '').trim();
              break;
            }
          }
          break;
        }
      }
      
      const sectionTitle = commentLine || `Query ${i + 1}`;
      console.log(`\nExecuting: ${sectionTitle}`);
      
      // Execute the query
      const { data, error } = await supabase.rpc('run_sql_with_results', { sql: query });
      
      if (error) {
        console.error(`Error executing query: ${error.message}`);
        output += `## ${sectionTitle}\n\nError: ${error.message}\n\n`;
        continue;
      }
      
      // Format and log the results
      console.log(`Results for: ${sectionTitle}`);
      console.log(data);
      
      // Add to output file
      output += `## ${sectionTitle}\n\n`;
      
      if (data && data.length > 0) {
        // Create markdown table header
        const headers = Object.keys(data[0]);
        output += '| ' + headers.join(' | ') + ' |\n';
        output += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
        
        // Add table rows
        data.forEach(row => {
          output += '| ' + headers.map(header => {
            const value = row[header];
            return value === null ? 'NULL' : String(value).replace(/\n/g, ' ');
          }).join(' | ') + ' |\n';
        });
      } else {
        output += 'No results returned.\n';
      }
      
      output += '\n';
    }
    
    // Write results to file
    fs.writeFileSync(outputFile, output);
    console.log(`\nInspection complete. Results saved to ${outputFile}`);
    
  } catch (error) {
    console.error('Unexpected error during inspection:', error);
  }
}

// Create the run_sql_with_results function if it doesn't exist
async function createHelperFunction() {
  const functionSql = `
  CREATE OR REPLACE FUNCTION run_sql_with_results(sql text)
  RETURNS JSONB AS $$
  DECLARE
      result JSONB;
  BEGIN
      EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || sql || ') t' INTO result;
      RETURN result;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const { error } = await supabase.rpc('run_sql', { sql: functionSql });
  
  if (error) {
    console.error('Error creating helper function:', error);
    
    // Try creating the run_sql function first
    const basicSql = `
    CREATE OR REPLACE FUNCTION run_sql(sql text)
    RETURNS void AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: basicError } = await supabase.rpc('run_sql', { sql: basicSql });
    
    if (basicError) {
      console.error('Error creating basic run_sql function:', basicError);
      return false;
    }
    
    // Try again with the results function
    const { error: retryError } = await supabase.rpc('run_sql', { sql: functionSql });
    
    if (retryError) {
      console.error('Error creating helper function on retry:', retryError);
      return false;
    }
  }
  
  return true;
}

// Run the inspection
createHelperFunction()
  .then(success => {
    if (success) {
      return inspectDatabase();
    } else {
      console.error('Failed to create helper function. Cannot proceed with inspection.');
      process.exit(1);
    }
  })
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 