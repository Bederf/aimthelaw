-- Migration to change client_id in conversations table from UUID to text
-- First, drop the foreign key constraint and index
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;
DROP INDEX IF EXISTS idx_conversations_client_id;

-- Create a temporary column to store the text version of client_id
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS client_id_text TEXT;

-- Update the temporary column with the text representation of UUID
UPDATE conversations 
SET client_id_text = (
  -- Get the user_id (text format like LAW_SNOW_801010 or CL_DOE_771212) from profiles table
  SELECT p.user_id 
  FROM profiles p 
  WHERE p.id = conversations.client_id
);

-- Drop the old client_id column
ALTER TABLE conversations DROP COLUMN client_id;

-- Rename the temporary column to client_id
ALTER TABLE conversations RENAME COLUMN client_id_text TO client_id;

-- Recreate the index on the new text column
CREATE INDEX idx_conversations_client_id ON conversations(client_id);

-- Update RLS policies to use text client_id
DROP POLICY IF EXISTS lawyer_select_conversations ON conversations;
CREATE POLICY lawyer_select_conversations ON conversations
  FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT p.user_id
    FROM lawyer_clients lc
    JOIN profiles p ON lc.client_id = p.id
    WHERE lc.lawyer_id = auth.uid()
  ));

DROP POLICY IF EXISTS lawyer_insert_conversations ON conversations;
CREATE POLICY lawyer_insert_conversations ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (
    SELECT p.user_id
    FROM lawyer_clients lc
    JOIN profiles p ON lc.client_id = p.id
    WHERE lc.lawyer_id = auth.uid()
  ));

DROP POLICY IF EXISTS lawyer_update_conversations ON conversations;
CREATE POLICY lawyer_update_conversations ON conversations
  FOR UPDATE TO authenticated
  USING (client_id IN (
    SELECT p.user_id
    FROM lawyer_clients lc
    JOIN profiles p ON lc.client_id = p.id
    WHERE lc.lawyer_id = auth.uid()
  ));

-- Update conversation_messages policies
DROP POLICY IF EXISTS lawyer_select_messages ON conversation_messages;
CREATE POLICY lawyer_select_messages ON conversation_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT c.id
    FROM conversations c
    WHERE c.client_id IN (
      SELECT p.user_id
      FROM lawyer_clients lc
      JOIN profiles p ON lc.client_id = p.id
      WHERE lc.lawyer_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS lawyer_insert_messages ON conversation_messages;
CREATE POLICY lawyer_insert_messages ON conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT c.id
    FROM conversations c
    WHERE c.client_id IN (
      SELECT p.user_id
      FROM lawyer_clients lc
      JOIN profiles p ON lc.client_id = p.id
      WHERE lc.lawyer_id = auth.uid()
    )
  )); 