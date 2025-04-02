-- Migration to change client_id in conversation_states table from UUID to text
-- First, drop any existing foreign key constraint
ALTER TABLE conversation_states DROP CONSTRAINT IF EXISTS conversation_states_client_id_fkey;
DROP INDEX IF EXISTS idx_conversation_states_client_id;

-- Create a temporary column to store the text version of client_id
ALTER TABLE conversation_states ADD COLUMN IF NOT EXISTS client_id_text TEXT;

-- Update the temporary column with the text representation of UUID
UPDATE conversation_states 
SET client_id_text = (
  -- Get the user_id (text format like LAW_SNOW_801010 or CL_DOE_771212) from profiles table
  SELECT p.user_id 
  FROM profiles p 
  WHERE p.id = conversation_states.client_id
);

-- If there are any records with NULL client_id_text (because profile wasn't found),
-- use a fallback of the original UUID
UPDATE conversation_states
SET client_id_text = client_id::text
WHERE client_id_text IS NULL AND client_id IS NOT NULL;

-- Drop the old client_id column
ALTER TABLE conversation_states DROP COLUMN client_id;

-- Rename the temporary column to client_id
ALTER TABLE conversation_states RENAME COLUMN client_id_text TO client_id;

-- Recreate the index on the new text column
CREATE INDEX idx_conversation_states_client_id ON conversation_states(client_id);

-- Update RLS policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'lawyer_select_conversation_states'
  ) THEN
    DROP POLICY IF EXISTS lawyer_select_conversation_states ON conversation_states;
    CREATE POLICY lawyer_select_conversation_states ON conversation_states
      FOR SELECT TO authenticated
      USING (client_id IN (
        SELECT p.user_id
        FROM lawyer_clients lc
        JOIN profiles p ON lc.client_id = p.id
        WHERE lc.lawyer_id = auth.uid()
      ));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'lawyer_insert_conversation_states'
  ) THEN
    DROP POLICY IF EXISTS lawyer_insert_conversation_states ON conversation_states;
    CREATE POLICY lawyer_insert_conversation_states ON conversation_states
      FOR INSERT TO authenticated
      WITH CHECK (client_id IN (
        SELECT p.user_id
        FROM lawyer_clients lc
        JOIN profiles p ON lc.client_id = p.id
        WHERE lc.lawyer_id = auth.uid()
      ));
  END IF;
END $$; 