-- Comprehensive database inspection script

-- Get a list of all tables in the public schema
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- Token-related tables inspection
-- 1. token_balances table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'token_balances'
ORDER BY 
    ordinal_position;

-- 2. token_usage table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'token_usage'
ORDER BY 
    ordinal_position;

-- 3. token_transactions table (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'token_transactions'
ORDER BY 
    ordinal_position;

-- Document-related tables inspection
-- 1. client_files table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'client_files'
ORDER BY 
    ordinal_position;

-- 2. document_chunks table (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'document_chunks'
ORDER BY 
    ordinal_position;

-- 3. document_embeddings table (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'document_embeddings'
ORDER BY 
    ordinal_position;

-- Client and user tables inspection
-- 1. clients table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'clients'
ORDER BY 
    ordinal_position;

-- 2. lawyer_clients table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'lawyer_clients'
ORDER BY 
    ordinal_position;

-- Conversation tables inspection
-- 1. conversations table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'conversations'
ORDER BY 
    ordinal_position;

-- 2. conversation_messages table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'conversation_messages'
ORDER BY 
    ordinal_position;

-- Check all foreign key relationships
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Check all unique constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE';

-- Sample data from token_balances
SELECT * FROM token_balances LIMIT 10;

-- Check for duplicate token_balances records
SELECT 
    client_id, 
    COUNT(*) as record_count
FROM 
    token_balances
GROUP BY 
    client_id
HAVING 
    COUNT(*) > 1;

-- Sample data from token_usage
SELECT * FROM token_usage LIMIT 10;

-- Sample data from clients
SELECT * FROM clients LIMIT 10;

-- Sample data from conversations
SELECT * FROM conversations LIMIT 10;

-- Sample data from conversation_messages
SELECT * FROM conversation_messages LIMIT 10; 