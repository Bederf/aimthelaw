-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  token_usage JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);

-- Add RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Lawyer can see conversations for their clients
CREATE POLICY lawyer_select_conversations ON conversations
  FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT client_id FROM lawyer_clients WHERE lawyer_id = auth.uid()
  ));

-- Lawyer can insert conversations for their clients
CREATE POLICY lawyer_insert_conversations ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (
    SELECT client_id FROM lawyer_clients WHERE lawyer_id = auth.uid()
  ));

-- Lawyer can update conversations for their clients
CREATE POLICY lawyer_update_conversations ON conversations
  FOR UPDATE TO authenticated
  USING (client_id IN (
    SELECT client_id FROM lawyer_clients WHERE lawyer_id = auth.uid()
  ));

-- Lawyer can see messages in conversations for their clients
CREATE POLICY lawyer_select_messages ON conversation_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE client_id IN (
      SELECT client_id FROM lawyer_clients WHERE lawyer_id = auth.uid()
    )
  ));

-- Lawyer can insert messages in conversations for their clients
CREATE POLICY lawyer_insert_messages ON conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE client_id IN (
      SELECT client_id FROM lawyer_clients WHERE lawyer_id = auth.uid()
    )
  )); 