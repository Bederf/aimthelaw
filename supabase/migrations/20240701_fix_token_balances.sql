-- Fix duplicate token_balances records
-- This script will:
-- 1. Create a temporary table to store the aggregated token balances
-- 2. Delete all existing records from token_balances
-- 3. Insert the aggregated records back into token_balances
-- 4. Add a unique constraint to prevent future duplicates

-- Step 1: Create a temporary table with aggregated token balances
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

-- Step 2: Delete all existing records from token_balances
DELETE FROM token_balances;

-- Step 3: Insert the aggregated records back into token_balances
INSERT INTO token_balances (id, client_id, total_tokens, total_cost, balance, last_updated)
SELECT 
    original_id,
    client_id,
    total_tokens,
    total_cost,
    balance,
    last_updated
FROM 
    temp_token_balances;

-- Step 4: Add a unique constraint to prevent future duplicates
-- First check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'token_balances_client_id_key'
    ) THEN
        ALTER TABLE token_balances ADD CONSTRAINT token_balances_client_id_key UNIQUE (client_id);
    END IF;
END
$$;

-- Drop the temporary table
DROP TABLE temp_token_balances;

-- Create or replace a function to safely update token balances
CREATE OR REPLACE FUNCTION safe_update_token_balance(
    p_client_id UUID,
    p_tokens INTEGER,
    p_cost NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    -- Try to update existing record
    UPDATE token_balances
    SET 
        total_tokens = total_tokens + p_tokens,
        total_cost = total_cost + p_cost,
        last_updated = NOW()
    WHERE client_id = p_client_id;
    
    -- If no record was updated, insert a new one
    IF NOT FOUND THEN
        INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, last_updated)
        VALUES (p_client_id, p_tokens, p_cost, 0, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql; 