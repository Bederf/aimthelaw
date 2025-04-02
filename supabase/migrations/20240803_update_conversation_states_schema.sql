-- Migration to ensure conversation_states table has the correct schema for text client_id
-- First, check if the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_states') THEN
        -- Create the table with text client_id
        CREATE TABLE public.conversation_states (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            client_id TEXT NOT NULL,
            messages JSONB NOT NULL DEFAULT '[]'::jsonb,
            current_node TEXT,
            completed_nodes JSONB,
            context JSONB,
            awaiting_human_input BOOLEAN DEFAULT FALSE,
            token_usage INTEGER DEFAULT 0,
            cost DECIMAL(10,4) DEFAULT 0,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_conversation_states_conversation_id ON conversation_states(conversation_id);
        CREATE INDEX idx_conversation_states_client_id ON conversation_states(client_id);
    ELSE
        -- Table exists, ensure client_id is TEXT type
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'conversation_states' 
            AND column_name = 'client_id' 
            AND data_type != 'text'
        ) THEN
            -- Alter the column type to TEXT if it's not already
            ALTER TABLE conversation_states ALTER COLUMN client_id TYPE TEXT;
        END IF;
    END IF;
END $$; 