-- Inspect the clients table structure
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

-- Inspect the lawyer_clients table structure
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

-- Inspect the conversations table structure
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

-- Inspect the conversation_messages table structure
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

-- Check foreign key relationships
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
WHERE tc.constraint_type = 'FOREIGN KEY' AND
    (tc.table_name = 'conversations' OR 
     tc.table_name = 'conversation_messages' OR
     tc.table_name = 'clients' OR
     tc.table_name = 'lawyer_clients');

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename IN ('conversations', 'conversation_messages', 'clients', 'lawyer_clients');

-- Sample data query for conversations
SELECT * FROM conversations LIMIT 5;

-- Sample data query for conversation_messages
SELECT * FROM conversation_messages LIMIT 5;

-- Sample data query for lawyer-client relationships
SELECT 
    lc.lawyer_id,
    lc.client_id,
    c.id as client_table_id
FROM 
    lawyer_clients lc
JOIN 
    clients c ON lc.client_id = c.client_id
LIMIT 5; 