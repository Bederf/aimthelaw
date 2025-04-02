-- Direct fix for token_balances table
-- This script can be run directly in the Supabase SQL editor

-- First, identify clients with duplicate records
SELECT client_id, COUNT(*) as record_count
FROM token_balances
GROUP BY client_id
HAVING COUNT(*) > 1;

-- Create a temporary table to store one record per client with aggregated values
CREATE TEMP TABLE fixed_token_balances AS
WITH ranked_records AS (
  SELECT 
    id,
    client_id,
    total_tokens,
    total_cost,
    balance,
    last_updated,
    created_at,
    -- Rank records by created_at date (keep the oldest)
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at) as row_rank
  FROM 
    token_balances
),
aggregated_values AS (
  SELECT 
    client_id,
    SUM(total_tokens) AS total_tokens,
    SUM(total_cost) AS total_cost,
    MAX(balance) AS balance,
    MAX(last_updated) AS last_updated
  FROM 
    token_balances
  GROUP BY 
    client_id
)
SELECT 
  r.id,
  r.client_id,
  a.total_tokens,
  a.total_cost,
  a.balance,
  a.last_updated,
  r.created_at
FROM 
  ranked_records r
JOIN 
  aggregated_values a ON r.client_id = a.client_id
WHERE 
  r.row_rank = 1;

-- Delete all existing records from token_balances
DELETE FROM token_balances;

-- Insert the fixed records back into token_balances
INSERT INTO token_balances (id, client_id, total_tokens, total_cost, balance, last_updated, created_at)
SELECT 
  id,
  client_id,
  total_tokens,
  total_cost,
  balance,
  last_updated,
  created_at
FROM 
  fixed_token_balances;

-- Drop the temporary table
DROP TABLE fixed_token_balances;

-- Add a unique constraint to prevent future duplicates if it doesn't exist
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

-- Create or replace the safe_update_token_balance function
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

-- Verify that duplicates are fixed
SELECT client_id, COUNT(*) as record_count
FROM token_balances
GROUP BY client_id
HAVING COUNT(*) > 1; 