-- Fix token_balances table columns to match code usage
-- This migration ensures the token_balances table has the correct columns
-- and migrates data from old column names to new ones if needed

-- First, check if we need to add the total_tokens column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'total_tokens'
    ) THEN
        -- Add total_tokens column
        ALTER TABLE token_balances ADD COLUMN total_tokens BIGINT DEFAULT 0;
        
        -- Copy data from tokens_used to total_tokens if tokens_used exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'token_balances' 
            AND column_name = 'tokens_used'
        ) THEN
            UPDATE token_balances SET total_tokens = tokens_used;
        END IF;
    END IF;
END $$;

-- Next, check if we need to add the total_cost column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'total_cost'
    ) THEN
        -- Add total_cost column
        ALTER TABLE token_balances ADD COLUMN total_cost DECIMAL(10,4) DEFAULT 0;
        
        -- Copy data from cost to total_cost if cost exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'token_balances' 
            AND column_name = 'cost'
        ) THEN
            UPDATE token_balances SET total_cost = cost;
        END IF;
    END IF;
END $$;

-- Check if we need to add the last_updated column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'last_updated'
    ) THEN
        -- Add last_updated column
        ALTER TABLE token_balances ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        
        -- Copy data from updated_at to last_updated if updated_at exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'token_balances' 
            AND column_name = 'updated_at'
        ) THEN
            UPDATE token_balances SET last_updated = updated_at;
        END IF;
    END IF;
END $$;

-- Update the RPC functions to use the correct column names
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

-- Update the record_token_usage function to use the correct column names
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
    
    -- Update token balance using safe_update_token_balance
    PERFORM safe_update_token_balance(p_client_id, p_tokens_used, p_cost);
    
    RETURN new_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix token_balances table column inconsistencies
-- This migration ensures that the token_balances table has consistent column names
-- and handles the transition from updated_at to last_updated

-- First, check if both columns exist
DO $$ 
BEGIN
    -- Check if updated_at exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'updated_at'
    ) THEN
        -- Check if last_updated also exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'token_balances' 
            AND column_name = 'last_updated'
        ) THEN
            -- Both columns exist, copy data from last_updated to updated_at
            -- and then drop last_updated
            UPDATE token_balances
            SET updated_at = last_updated
            WHERE last_updated IS NOT NULL AND (updated_at IS NULL OR last_updated > updated_at);
            
            -- Drop the last_updated column
            ALTER TABLE token_balances DROP COLUMN last_updated;
            
            RAISE NOTICE 'Merged last_updated into updated_at and dropped last_updated column';
        ELSE
            -- Only updated_at exists, which is fine
            RAISE NOTICE 'Only updated_at exists, no changes needed';
        END IF;
    ELSE
        -- updated_at doesn't exist
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'token_balances' 
            AND column_name = 'last_updated'
        ) THEN
            -- Only last_updated exists, rename it to updated_at
            ALTER TABLE token_balances RENAME COLUMN last_updated TO updated_at;
            RAISE NOTICE 'Renamed last_updated to updated_at';
        ELSE
            -- Neither column exists, add updated_at
            ALTER TABLE token_balances ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column';
        END IF;
    END IF;
END $$;

-- Ensure the updated_at column has a default value
ALTER TABLE token_balances 
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_token_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_token_balances_updated_at ON token_balances;

-- Create the trigger
CREATE TRIGGER update_token_balances_updated_at
BEFORE UPDATE ON token_balances
FOR EACH ROW
EXECUTE FUNCTION update_token_balances_updated_at();

-- Update all functions that interact with token_balances to use updated_at
CREATE OR REPLACE FUNCTION safe_update_token_balance(
    p_client_id UUID,
    p_tokens INTEGER,
    p_cost NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    -- Use upsert operation to handle the unique constraint
    INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, updated_at)
    VALUES (p_client_id, p_tokens, p_cost, 0, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET
        total_tokens = token_balances.total_tokens + p_tokens,
        total_cost = token_balances.total_cost + p_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the record_token_usage function to use updated_at
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

-- Update the recalculate_token_balance function to use updated_at
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
    INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, updated_at)
    VALUES (p_client_id, total_tokens_used, total_cost_incurred, 0, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET
        total_tokens = total_tokens_used,
        total_cost = total_cost_incurred,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 