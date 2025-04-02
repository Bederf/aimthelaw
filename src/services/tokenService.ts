import { supabase } from '@/integrations/supabase/client';
import type { TokenUsageRequest, TokenInfo } from '@/types/ai';
import { billingService } from './billingService';

// Define interfaces for token usage data
interface TokenUsageRecord {
  id: string;
  client_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  model: string;
  service: string;
  timestamp: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface UsageByModelOrService {
  tokens: number;
  cost: number;
}

interface TokenUsageSummary {
  total_tokens: number;
  total_cost: number;
  usage_by_model: Record<string, UsageByModelOrService>;
  usage_by_service: Record<string, UsageByModelOrService>;
}

export class TokenService {
  /**
   * Get token usage information for a specific user
   * @param userId The user ID to get token info for
   * @returns TokenInfo object with usage details
   */
  async getTokenInfo(userId: string): Promise<TokenInfo> {
    try {
      // Query the token_usage table for the user's current token count
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching token info:', error);
        return { used: 0 };
      }
      
      const usedTokens = typeof data?.total_tokens === 'number' ? data.total_tokens : 0;
      
      return { used: usedTokens };
    } catch (error) {
      console.error('Error in getTokenInfo:', error);
      return { used: 0 };
    }
  }

  /**
   * Get token usage information for a specific client
   * @param clientId The client ID to get token info for
   * @returns TokenInfo object with usage details
   */
  async getClientTokenInfo(clientId: string): Promise<TokenInfo> {
    try {
      // Check authentication status first with more detailed logging
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        // Try to refresh the session
        console.log('No active session found in tokenService, attempting to refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('Session expired and refresh failed in tokenService:', refreshError);
          
          // Add more detailed logging about the error type
          if (refreshError) {
            console.error('Refresh error type:', refreshError.name, 'Message:', refreshError.message);
          }
          
          throw new Error('Authentication failed: ' + (refreshError?.message || 'Session expired'));
        }
        console.log('Session refreshed successfully in tokenService');
        
        // Add a delay after refresh to ensure token propagation
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Log session information (without sensitive details)
        console.log('Active session found in tokenService, expires at:', 
          session.session.expires_at ? new Date(session.session.expires_at * 1000).toISOString() : 'unknown');
        
        // Check if token is about to expire (less than 5 minutes)
        const expiresAt = session.session.expires_at ? session.session.expires_at * 1000 : 0;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log('Session expires soon, refreshing proactively in tokenService...');
          await supabase.auth.refreshSession();
          console.log('Session refreshed proactively in tokenService');
          
          // Add a delay after refresh to ensure token propagation
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // First try to get the total usage directly from token_usage table
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const { data: usageData, error: usageError } = await supabase
            .from('token_usage')
            .select('total_tokens, cost')
            .eq('client_id', clientId);
            
          if (usageError) {
            console.error('Error fetching token usage:', usageError);
            
            // If it's an authentication error, attempt refresh and retry
            if (usageError.message?.includes('JWT') || usageError.code === 'PGRST301') {
              if (retryCount < maxRetries) {
                console.warn('Authentication error in token service, attempt refresh and retry:', retryCount + 1);
                
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                
                // Refresh token
                await supabase.auth.refreshSession();
                
                // Add delay after refresh
                await new Promise(resolve => setTimeout(resolve, 500));
                
                retryCount++;
                continue; // Retry the operation
              } else {
                console.error('Max retries reached for authentication errors');
                throw new Error('Authentication error after max retries: ' + usageError.message);
              }
            }
            
            return { used: 0, cost: 0 };
          }
          
          // Calculate totals from usage data
          const totalTokens = usageData?.reduce((sum, record) => 
            sum + (typeof record.total_tokens === 'number' ? record.total_tokens : 0), 0) || 0;
          
          const totalCost = usageData?.reduce((sum, record) => 
            sum + (typeof record.cost === 'number' ? record.cost : 0), 0) || 0;
          
          // Update the token_balances record with the latest totals
          try {
            const { error: upsertError } = await supabase
              .from('token_balances')
              .upsert(
                {
                  client_id: clientId,
                  total_tokens: totalTokens,
                  total_cost: totalCost,
                  updated_at: new Date().toISOString()
                },
                {
                  onConflict: 'client_id',
                  ignoreDuplicates: false
                }
              );
              
            if (upsertError) {
              console.error('Error updating token balance:', upsertError);
              // Continue anyway - this is not critical
            }
          } catch (upsertError) {
            console.error('Exception updating token balance:', upsertError);
            // Continue anyway - this is not critical
          }
          
          return { 
            used: totalTokens,
            cost: totalCost
          };
        } catch (innerError) {
          if (retryCount >= maxRetries) {
            throw innerError; // Rethrow if we've exhausted retries
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
      }
      
      // This should never be reached due to the while loop, but TypeScript wants a return
      return { used: 0, cost: 0 };
    } catch (error) {
      console.error('Error in getClientTokenInfo:', error);
      // Rethrow authentication errors so they can be handled by the caller
      if (error instanceof Error && 
          (error.message.includes('Authentication') || 
           error.message.includes('JWT') || 
           error.message.includes('token'))) {
        throw error;
      }
      return { used: 0, cost: 0 };
    }
  }

  /**
   * Track token usage for a user or client
   * @param usage Token usage request data
   */
  async trackTokenUsage(usage: {
    userId?: string;
    clientId: string;
    tokens: number;
    model: string;
    service: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Calculate cost based on tokens
      const cost = await this.calculateCost(usage.tokens);
      
      // Use the database function to record token usage and update balance
      const { data, error } = await supabase.rpc('record_token_usage', {
        p_client_id: usage.clientId,
        p_tokens_used: usage.tokens,
        p_cost: cost,
        p_service: usage.service,
        p_model: usage.model,
        p_metadata: usage.metadata || null
      });
      
      if (error) {
        console.error('Error recording token usage:', error);
        
        // Fall back to direct updates if the RPC fails
        await this.recordTokenUsageDirect(usage.clientId, usage.tokens, cost, usage.service, usage.model, usage.metadata);
      }
    } catch (error) {
      console.error('Error in trackTokenUsage:', error);
    }
  }

  /**
   * Direct method to record token usage when RPC fails
   * @private
   */
  private async recordTokenUsageDirect(
    clientId: string, 
    tokens: number, 
    cost: number, 
    service: string, 
    model: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Insert into token_usage
      const { error: usageError } = await supabase
        .from('token_usage')
        .insert({
          client_id: clientId,
          prompt_tokens: Math.floor(tokens * 0.7),  // Estimate prompt tokens as 70% of total
          completion_tokens: Math.floor(tokens * 0.3),  // Estimate completion tokens as 30% of total
          total_tokens: tokens,
          cost: cost,
          service: service,
          model: model,
          metadata: metadata,
          created_at: new Date().toISOString()
        });
        
      if (usageError) {
        console.error('Error inserting token usage record:', usageError);
      }
      
      // 2. Update token balance
      await this.updateClientTokenBalance(clientId);
    } catch (error) {
      console.error('Error in recordTokenUsageDirect:', error);
    }
  }

  /**
   * Update the token_balances table with the total token usage from token_usage for a specific client
   * @param clientId The client ID to update token balance for
   */
  async updateClientTokenBalance(clientId: string): Promise<void> {
    try {
      // Get total tokens used from token_usage table
      const { data: usageData, error: usageError } = await supabase
        .from('token_usage')
        .select('total_tokens, cost')
        .eq('client_id', clientId);

      if (usageError) throw usageError;

      // Calculate totals with type safety
      const totalTokens = usageData?.reduce((sum, record) => 
        sum + (typeof record.total_tokens === 'number' ? record.total_tokens : 0), 0) || 0;
      const totalCost = usageData?.reduce((sum, record) => 
        sum + (typeof record.cost === 'number' ? record.cost : 0), 0) || 0;

      // Use upsert to handle both insert and update cases
      const { error: updateError } = await supabase
        .from('token_balances')
        .upsert({
          client_id: clientId,
          total_tokens: totalTokens,
          total_cost: totalCost,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        });

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error updating client token balance:', error);
      throw error;
    }
  }

  /**
   * Recalculate token balance from usage data
   * @param clientId The client ID to recalculate balance for
   */
  async recalculateTokenBalance(clientId: string): Promise<boolean> {
    try {
      // Try to use the database function first
      const { error: rpcError } = await supabase.rpc('recalculate_token_balance', {
        p_client_id: clientId
      });
      
      if (rpcError) {
        console.error('Error using recalculate_token_balance RPC:', rpcError);
        
        // Fall back to updateClientTokenBalance which has its own fallback mechanism
        await this.updateClientTokenBalance(clientId);
      }
      
      return true;
    } catch (error) {
      console.error('Error in recalculateTokenBalance:', error);
      return false;
    }
  }

  /**
   * Calculate the cost for token usage
   * @param tokenCount Number of tokens used
   * @returns The cost in currency units
   */
  async calculateCost(tokenCount: number): Promise<number> {
    try {
      // Get the current token rate from the database
      const tokenCost = await billingService.getTokenCost();
      return (tokenCount / 1000) * tokenCost.rate;
    } catch (error) {
      console.error('Error getting token rate, using default:', error);
      // Fallback to default rate if there's an error
      const DEFAULT_COST_PER_1000_TOKENS = 0.02;
      return (tokenCount / 1000) * DEFAULT_COST_PER_1000_TOKENS;
    }
  }

  /**
   * Get usage history for a client
   * @param clientId The client ID to get usage history for
   * @returns Array of token usage records
   */
  async getUsageHistory(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);  // Added limit for performance

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting usage history:', error);
      return [];
    }
  }

  /**
   * Get monthly token usage for a client within a date range
   * @param clientId The client ID to get monthly usage for
   * @param startDate Start date for the range
   * @param endDate End date for the range
   * @returns Token usage summary
   */
  async getClientMonthlyUsage(clientId: string, startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Use a safer approach for type handling
      const usage = (data || []).reduce((acc: TokenUsageSummary, record: any) => {
        // Update total tokens and cost
        acc.total_tokens += Number(record.total_tokens) || 0;
        acc.total_cost += Number(record.cost) || 0;

        // Get model and service as strings
        const model = String(record.model || '');
        const service = String(record.service || '');

        // Update usage by model
        if (!acc.usage_by_model[model]) {
          acc.usage_by_model[model] = { tokens: 0, cost: 0 };
        }
        acc.usage_by_model[model].tokens += Number(record.total_tokens) || 0;
        acc.usage_by_model[model].cost += Number(record.cost) || 0;

        // Update usage by service
        if (!acc.usage_by_service[service]) {
          acc.usage_by_service[service] = { tokens: 0, cost: 0 };
        }
        acc.usage_by_service[service].tokens += Number(record.total_tokens) || 0;
        acc.usage_by_service[service].cost += Number(record.cost) || 0;

        return acc;
      }, {
        total_tokens: 0,
        total_cost: 0,
        usage_by_model: {},
        usage_by_service: {}
      });

      return usage;
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Create an initial token balance record for a client if one doesn't exist
   * @param clientId The client ID to create a token balance for
   * @returns Success status
   */
  async createInitialTokenBalance(clientId: string): Promise<boolean> {
    try {
      // Use the safe_update_token_balance function
      const { error } = await supabase.rpc('safe_update_token_balance', {
        p_client_id: clientId,
        p_tokens: 0,
        p_cost: 0
      });
      
      if (error) {
        console.error('Error creating initial token balance:', error);
        
        // Fall back to direct insert with upsert
        const { error: upsertError } = await supabase
          .from('token_balances')
          .upsert(
            {
              client_id: clientId,
              total_tokens: 0,
              total_cost: 0,
              balance: 0,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'client_id',
              ignoreDuplicates: false
            }
          );
          
        if (upsertError) {
          console.error('Error upserting initial token balance:', upsertError);
          return false;
        }
      }
      
      console.log('Created/updated initial token balance for client:', clientId);
      return true;
    } catch (error) {
      console.error('Error in createInitialTokenBalance:', error);
      return false;
    }
  }
}

// Export a singleton instance of the TokenService
export const tokenService = new TokenService(); 