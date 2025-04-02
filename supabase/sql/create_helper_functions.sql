-- Create helper functions for token balance management

-- Function to check for duplicate token balance records
CREATE OR REPLACE FUNCTION check_token_balance_duplicates()
RETURNS TABLE (client_id UUID, record_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT tb.client_id, COUNT(*) as record_count
    FROM token_balances tb
    GROUP BY tb.client_id
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run arbitrary SQL (admin only)
-- Note: This is potentially dangerous and should be restricted to admin users
CREATE OR REPLACE FUNCTION run_sql(sql text)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely update token balances
CREATE OR REPLACE FUNCTION safe_update_token_balance(
    p_client_id UUID,
    p_tokens INTEGER,
    p_cost NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
    -- Use upsert to handle the unique constraint
    INSERT INTO token_balances (client_id, total_tokens, total_cost, balance, last_updated)
    VALUES (p_client_id, p_tokens, p_cost, 0, NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET
        total_tokens = token_balances.total_tokens + p_tokens,
        total_cost = token_balances.total_cost + p_cost,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 