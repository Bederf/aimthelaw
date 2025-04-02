-- Comprehensive Token System Fix
-- This migration:
-- 1. Fixes duplicate token_balances records
-- 2. Adds a unique constraint on client_id
-- 3. Creates helper functions for token management
-- 4. Ensures data consistency between token_usage and token_balances

-- Step 1: Fix duplicate token_balances records
-- First, create a temporary table with aggregated token balances
CREATE TEMP TABLE temp_token_balances AS
SELECT 
    client_id,
    SUM(total_tokens) AS total_tokens,
    SUM(total_cost) AS total_cost,
    MAX(balance) AS balance,
    MAX(last_updated) AS last_updated,
    -- Use first_value instead of MIN for UUID type
    first_value(id) OVER (PARTITION BY client_id ORDER BY created_at) AS original_id
FROM 
    token_balances
GROUP BY 
    client_id, id, created_at;

-- Log the number of duplicates found
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT client_id, COUNT(*) as record_count
        FROM token_balances
        GROUP BY client_id
        HAVING COUNT(*) > 1
    ) as duplicates;
    
    RAISE NOTICE 'Found % clients with duplicate token balance records', duplicate_count;
END $$;

-- Delete all existing records from token_balances
DELETE FROM token_balances;

-- Insert the aggregated records back into token_balances
INSERT INTO token_balances (id, client_id, total_tokens, total_cost, balance, last_updated, created_at)
SELECT 
    original_id,
    client_id,
    total_tokens,
    total_cost,
    balance,
    last_updated,
    NOW()
FROM 
    temp_token_balances;

-- Drop the temporary table
DROP TABLE temp_token_balances;

-- Step 2: Add a unique constraint to prevent future duplicates
-- First check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'token_balances_client_id_key'
    ) THEN
        ALTER TABLE token_balances ADD CONSTRAINT token_balances_client_id_key UNIQUE (client_id);
        RAISE NOTICE 'Added unique constraint on token_balances.client_id';
    ELSE
        RAISE NOTICE 'Unique constraint on token_balances.client_id already exists';
    END IF;
END $$;

-- Step 3: Create or replace functions for token management

-- Function to safely update token balances
CREATE OR REPLACE FUNCTION safe_update_token_balance(
    p_client_id UUID,
    p_tokens INTEGER,
    p_cost NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    -- Use upsert operation to handle the unique constraint
    INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, last_updated)
    VALUES (p_client_id, p_tokens, p_cost, 0, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET
        total_tokens = token_balances.total_tokens + p_tokens,
        total_cost = token_balances.total_cost + p_cost,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record token usage and update balance in one transaction
CREATE OR REPLACE FUNCTION record_token_usage(
    p_client_id UUID,
    p_tokens_used INTEGER,
    p_cost NUMERIC,
    p_service TEXT DEFAULT NULL,
    p_model TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_usage_id UUID;
BEGIN
    -- Insert into token_usage
    INSERT INTO token_usage (client_id, tokens_used, cost, service, model, metadata, created_at)
    VALUES (p_client_id, p_tokens_used, p_cost, p_service, p_model, p_metadata, NOW())
    RETURNING id INTO new_usage_id;
    
    -- Update token balance
    PERFORM safe_update_token_balance(p_client_id, p_tokens_used, p_cost);
    
    RETURN new_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate token balances from usage data
CREATE OR REPLACE FUNCTION recalculate_token_balance(
    p_client_id UUID
) RETURNS VOID AS $$
DECLARE
    total_tokens_used INTEGER;
    total_cost_incurred NUMERIC;
BEGIN
    -- Calculate totals from token_usage
    SELECT 
        COALESCE(SUM(tokens_used), 0),
        COALESCE(SUM(cost), 0)
    INTO 
        total_tokens_used,
        total_cost_incurred
    FROM 
        token_usage
    WHERE 
        client_id = p_client_id;
    
    -- Update or insert token balance
    INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, last_updated)
    VALUES (p_client_id, total_tokens_used, total_cost_incurred, 0, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET
        total_tokens = total_tokens_used,
        total_cost = total_cost_incurred,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure token_usage table has necessary columns
DO $$
BEGIN
    -- Add client_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_usage' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE token_usage ADD COLUMN client_id UUID REFERENCES clients(id);
        RAISE NOTICE 'Added client_id column to token_usage table';
    END IF;
    
    -- Add service column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_usage' AND column_name = 'service'
    ) THEN
        ALTER TABLE token_usage ADD COLUMN service TEXT;
        RAISE NOTICE 'Added service column to token_usage table';
    END IF;
    
    -- Add model column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_usage' AND column_name = 'model'
    ) THEN
        ALTER TABLE token_usage ADD COLUMN model TEXT;
        RAISE NOTICE 'Added model column to token_usage table';
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_usage' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE token_usage ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column to token_usage table';
    END IF;
END $$;

-- Step 5: Create indexes for better performance
DO $$
BEGIN
    -- Create index on token_usage.client_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'token_usage' AND indexname = 'idx_token_usage_client_id'
    ) THEN
        CREATE INDEX idx_token_usage_client_id ON token_usage(client_id);
        RAISE NOTICE 'Created index on token_usage.client_id';
    END IF;
    
    -- Create index on token_usage.created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'token_usage' AND indexname = 'idx_token_usage_created_at'
    ) THEN
        CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);
        RAISE NOTICE 'Created index on token_usage.created_at';
    END IF;
END $$;

-- Step 6: Verify the fix
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT client_id, COUNT(*) as record_count
        FROM token_balances
        GROUP BY client_id
        HAVING COUNT(*) > 1
    ) as duplicates;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE 'Success: No duplicate token balance records found after fix';
    ELSE
        RAISE WARNING 'Warning: % clients still have duplicate token balance records', duplicate_count;
    END IF;
END $$; 