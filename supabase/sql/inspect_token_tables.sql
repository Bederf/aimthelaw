-- Inspect the token_balances table structure
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

-- Check for constraints on token_balances
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE
    tc.table_name = 'token_balances';

-- Count records and check for duplicates in token_balances
SELECT 
    client_id, 
    COUNT(*) as record_count
FROM 
    token_balances
GROUP BY 
    client_id
HAVING 
    COUNT(*) > 1;

-- Sample data from token_balances
SELECT * FROM token_balances LIMIT 10;

-- Check token_usage table structure
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

-- Sample data from token_usage
SELECT * FROM token_usage LIMIT 10; 