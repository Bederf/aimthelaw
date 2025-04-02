-- Fix duplicate token_balances records
-- This script can be run directly in the Supabase SQL editor

-- First, identify clients with duplicate records
SELECT client_id, COUNT(*) as record_count
FROM token_balances
GROUP BY client_id
HAVING COUNT(*) > 1;

-- Create a temporary table with aggregated token balances
CREATE TEMP TABLE temp_token_balances AS
SELECT 
    client_id,
    SUM(total_tokens) AS total_tokens,
    SUM(total_cost) AS total_cost,
    MAX(balance) AS balance,
    MAX(last_updated) AS last_updated,
    MIN(id) AS original_id
FROM 
    token_balances
GROUP BY 
    client_id;

-- For each client with duplicates, keep one record and delete the rest
DO $$
DECLARE
    client_rec RECORD;
    keep_id UUID;
BEGIN
    FOR client_rec IN 
        SELECT client_id
        FROM token_balances
        GROUP BY client_id
        HAVING COUNT(*) > 1
    LOOP
        -- Get the ID of the record to keep (the oldest one)
        SELECT MIN(id) INTO keep_id
        FROM token_balances
        WHERE client_id = client_rec.client_id;
        
        -- Update the record to keep with the aggregated values
        UPDATE token_balances
        SET 
            total_tokens = (
                SELECT total_tokens 
                FROM temp_token_balances 
                WHERE client_id = client_rec.client_id
            ),
            total_cost = (
                SELECT total_cost 
                FROM temp_token_balances 
                WHERE client_id = client_rec.client_id
            ),
            last_updated = NOW()
        WHERE id = keep_id;
        
        -- Delete the duplicate records
        DELETE FROM token_balances
        WHERE client_id = client_rec.client_id
        AND id != keep_id;
        
        RAISE NOTICE 'Fixed duplicates for client %', client_rec.client_id;
    END LOOP;
END $$;

-- Drop the temporary table
DROP TABLE temp_token_balances;

-- Add a unique constraint to prevent future duplicates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'token_balances_client_id_key'
    ) THEN
        ALTER TABLE token_balances ADD CONSTRAINT token_balances_client_id_key UNIQUE (client_id);
        RAISE NOTICE 'Added unique constraint on client_id';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Verify that duplicates are fixed
SELECT client_id, COUNT(*) as record_count
FROM token_balances
GROUP BY client_id
HAVING COUNT(*) > 1; 