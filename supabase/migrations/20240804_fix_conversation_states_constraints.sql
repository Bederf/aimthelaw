-- Migration to fix any remaining constraints forcing UUID validation on client_id
-- First, drop any constraints that might force UUID validation
DO $$ 
BEGIN
    -- Drop any foreign key constraint on client_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'conversation_states'
        AND ccu.column_name = 'client_id'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE conversation_states DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'conversation_states'
            AND ccu.column_name = 'client_id'
            LIMIT 1
        );
    END IF;
    
    -- Drop any check constraint on client_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'CHECK' 
        AND tc.table_name = 'conversation_states'
        AND ccu.column_name = 'client_id'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE conversation_states DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'CHECK' 
            AND tc.table_name = 'conversation_states'
            AND ccu.column_name = 'client_id'
            LIMIT 1
        );
    END IF;
    
    -- Now ensure client_id is TEXT type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_states' 
        AND column_name = 'client_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE conversation_states ALTER COLUMN client_id TYPE TEXT;
    END IF;
END $$;

-- Do the same for the conversations table
DO $$ 
BEGIN
    -- Drop any foreign key constraint on client_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'conversations'
        AND ccu.column_name = 'client_id'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE conversations DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'conversations'
            AND ccu.column_name = 'client_id'
            LIMIT 1
        );
    END IF;
    
    -- Drop any check constraint on client_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'CHECK' 
        AND tc.table_name = 'conversations'
        AND ccu.column_name = 'client_id'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE conversations DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'CHECK' 
            AND tc.table_name = 'conversations'
            AND ccu.column_name = 'client_id'
            LIMIT 1
        );
    END IF;
    
    -- Now ensure client_id is TEXT type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'client_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE conversations ALTER COLUMN client_id TYPE TEXT;
    END IF;
END $$; 