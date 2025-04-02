import supabase from "@/integrations/supabase/client";
import { AppError, ErrorType } from "@/utils/errorHandler";
import { billingService } from './billingService';

/**
 * Interface representing token usage information for a model or service
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

/**
 * Interface for token usage by model or service
 */
interface UsageByEntity {
  tokens: number;
  cost: number;
}

/**
 * Interface for token usage statistics
 */
export interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
  usageByModel: Record<string, UsageByEntity>;
  usageByService: Record<string, UsageByEntity>;
  usageHistory: TokenUsage[];
}

/**
 * Interface for token cost configuration
 */
export interface TokenCostConfig {
  model: string;
  promptTokenRate: number;
  completionTokenRate: number;
  globalMultiplier: number;
  effectiveDate: Date;
}

/**
 * A service for tracking and managing token usage in the AI application.
 */
export class TokenTrackingService {
  private tokenCosts: Record<string, { prompt: number, completion: number }> = {};
  private globalMultiplier: number = 1.0;
  private cachedTokenRate: number | null = null;
  private lastRateFetchTime: number = 0;
  private rateCacheValidityMs: number = 1000 * 60 * 5; // 5 minutes
  private costConfig: TokenCostConfig[] = [];
  
  /**
   * Initialize the token service by loading the current token costs
   */
  constructor() {
    this.loadTokenCosts();
  }
  
  /**
   * Load token costs from Supabase
   */
  async loadTokenCosts(): Promise<void> {
    try {
      // First try to get the global cost multiplier
      try {
        const { data: costMultiplierData, error: costMultiplierError } = await supabase
          .from('token_costs')
          .select('rate')
          .order('created_at', { ascending: false })
          .limit(1);

        if (costMultiplierError) {
          console.error('Error loading token cost multiplier:', costMultiplierError);
          // Continue with default multiplier
        } else if (costMultiplierData && costMultiplierData.length > 0) {
          this.globalMultiplier = costMultiplierData[0].rate || 1.0;
          console.log(`Loaded global token cost multiplier: ${this.globalMultiplier}`);
        }
      } catch (error) {
        console.error('Error loading token cost multiplier:', error);
        // Continue with default multiplier
      }

      // Then try to get the model-specific costs
      try {
        const { data: modelCostsData, error: modelCostsError } = await supabase
          .from('model_costs')
          .select('*')
          .order('created_at', { ascending: false });

        if (modelCostsError) {
          console.error('Error loading model costs:', modelCostsError);
          // Continue with default costs
        } else if (modelCostsData && modelCostsData.length > 0) {
          // Update the token costs with the latest values for each model
          const modelCostsMap: Record<string, { prompt: number, completion: number }> = {};
          
          modelCostsData.forEach(modelCost => {
            if (!modelCostsMap[modelCost.model]) {
              modelCostsMap[modelCost.model] = {
                prompt: modelCost.prompt_rate,
                completion: modelCost.completion_rate
              };
            }
          });
          
          this.tokenCosts = { ...this.tokenCosts, ...modelCostsMap };
          console.log('Loaded model-specific token costs:', this.tokenCosts);
        }
      } catch (error) {
        console.error('Error loading model costs:', error);
        // Continue with default costs
      }
    } catch (error) {
      console.error('Failed to load token costs:', error);
      // Initialize with default costs if there was an error
      this.initializeDefaultCosts();
    }
  }
  
  /**
   * Initialize default token costs if loading from database fails
   */
  private initializeDefaultCosts(): void {
    this.tokenCosts = {
      "gpt-4": { prompt: 0.03, completion: 0.06 },
      "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
      "gpt-4o": { prompt: 0.01, completion: 0.03 },
      "gpt-4o-mini": { prompt: 0.005, completion: 0.015 },
      "claude-3-opus-20240229": { prompt: 0.015, completion: 0.075 },
      "claude-3-7-sonnet": { prompt: 0.008, completion: 0.024 },
      "gpt-3.5-turbo": { prompt: 0.0015, completion: 0.002 }
    };
    
    this.globalMultiplier = 1.0;
    
    console.log("Using default token costs");
  }
  
  /**
   * Record token usage for a client
   * @param usage Token usage data
   */
  async recordTokenUsage(usage: {
    clientId: string;
    promptTokens: number;
    completionTokens: number;
    model: string;
    service: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const totalTokens = usage.promptTokens + usage.completionTokens;
      
      // Calculate cost
      const cost = await this.calculateDetailedCost({
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        model: usage.model
      });
      
      // Use the database function to record token usage and update balance
      const { data, error } = await supabase.rpc('record_token_usage', {
        p_client_id: usage.clientId,
        p_prompt_tokens: usage.promptTokens,
        p_completion_tokens: usage.completionTokens,
        p_total_tokens: totalTokens,
        p_cost: cost.totalCost,
        p_service: usage.service,
        p_model: usage.model,
        p_metadata: usage.metadata || null
      });
      
      if (error) {
        console.error('Error recording token usage:', error);
        
        // Fall back to direct updates if the RPC fails
        await this.recordTokenUsageDirect(
          usage.clientId, 
          usage.promptTokens,
          usage.completionTokens, 
          cost.totalCost, 
          usage.service, 
          usage.model, 
          usage.metadata
        );
      }
      
      // Update local storage for UI display
      this.updateLocalTokenCount(totalTokens, cost.totalCost);
      
      // Log the usage
      console.log(`Tracked ${totalTokens} tokens (${cost.totalCost.toFixed(6)} cost) for model ${usage.model}`);
      
    } catch (error) {
      console.error('Error in recordTokenUsage:', error);
    }
  }
  
  /**
   * Direct method to record token usage when RPC fails
   */
  private async recordTokenUsageDirect(
    clientId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    service: string,
    model: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const totalTokens = promptTokens + completionTokens;
      
      // Insert token usage record
      const { error: usageError } = await supabase.from("token_usage").insert([{
        client_id: clientId,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost,
        model,
        service,
        metadata,
        timestamp: new Date().toISOString()
      }]);
      
      if (usageError) {
        console.error("Error inserting token usage:", usageError);
      }
      
      // Update token balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("token_balances")
        .select("*")
        .eq("client_id", clientId)
        .single();
      
      if (balanceError && balanceError.code !== "PGRST116") { // PGRST116 is "not found"
        console.error("Error getting token balance:", balanceError);
      }
      
      if (balanceData) {
        // Update existing balance
        await supabase
          .from("token_balances")
          .update({
            total_tokens: balanceData.total_tokens + totalTokens,
            total_cost: parseFloat(balanceData.total_cost) + cost,
            updated_at: new Date().toISOString()
          })
          .eq("client_id", clientId);
      } else {
        // Create new balance record
        await supabase
          .from("token_balances")
          .insert([{
            client_id: clientId,
            total_tokens: totalTokens,
            total_cost: cost,
            updated_at: new Date().toISOString()
          }]);
      }
      
    } catch (error) {
      console.error("Error in recordTokenUsageDirect:", error);
    }
  }
  
  /**
   * Get token usage statistics for a client
   */
  async getClientUsageStats(clientId: string, startDate?: Date, endDate?: Date): Promise<TokenUsageStats> {
    try {
      // Default dates if not provided
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();
      
      // Get token usage records
      const { data: usageData, error: usageError } = await supabase
        .from("token_usage")
        .select("*")
        .eq("client_id", clientId)
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .order("timestamp", { ascending: false });
      
      if (usageError) {
        console.error("Error getting token usage:", usageError);
        throw new AppError("Failed to retrieve token usage statistics", ErrorType.API_RESPONSE);
      }
      
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("token_balances")
        .select("*")
        .eq("client_id", clientId)
        .single();
      
      if (balanceError && balanceError.code !== "PGRST116") {
        console.error("Error getting token balance:", balanceError);
      }
      
      // Calculate statistics
      let totalTokens = 0;
      let totalCost = 0;
      const usageByModel: Record<string, UsageByEntity> = {};
      const usageByService: Record<string, UsageByEntity> = {};
      const usageHistory: TokenUsage[] = [];
      
      // Process usage data
      if (usageData) {
        usageData.forEach(record => {
          // Update totals
          const recordTokens = record.total_tokens || 0;
          const recordCost = parseFloat(record.cost) || 0;
          
          totalTokens += recordTokens;
          totalCost += recordCost;
          
          // Update model usage
          const model = record.model || "unknown";
          if (!usageByModel[model]) {
            usageByModel[model] = { tokens: 0, cost: 0 };
          }
          usageByModel[model].tokens += recordTokens;
          usageByModel[model].cost += recordCost;
          
          // Update service usage
          const service = record.service || "unknown";
          if (!usageByService[service]) {
            usageByService[service] = { tokens: 0, cost: 0 };
          }
          usageByService[service].tokens += recordTokens;
          usageByService[service].cost += recordCost;
          
          // Add to history
          usageHistory.push({
            promptTokens: record.prompt_tokens || 0,
            completionTokens: record.completion_tokens || 0,
            totalTokens: recordTokens,
            cost: recordCost,
            timestamp: new Date(record.timestamp)
          });
        });
      }
      
      // Return the stats
      return {
        totalTokens,
        totalCost,
        usageByModel,
        usageByService,
        usageHistory
      };
      
    } catch (error) {
      console.error("Error in getClientUsageStats:", error);
      throw error;
    }
  }
  
  /**
   * Get the current token cost configuration
   */
  async getTokenCostConfig(): Promise<TokenCostConfig[]> {
    try {
      // Get the multiplier
      const { data: multiplierData, error: multiplierError } = await supabase
        .from("token_costs")
        .select("*")
        .eq("active", true)
        .single();
      
      if (multiplierError) {
        console.error("Error getting token cost multiplier:", multiplierError);
      }
      
      const globalMultiplier = multiplierData?.rate || 1.0;
      
      // Get model-specific costs
      const { data: modelCosts, error: modelError } = await supabase
        .from("model_costs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (modelError) {
        console.error("Error getting model costs:", modelError);
      }
      
      // Convert to token cost config
      const config: TokenCostConfig[] = [];
      
      if (modelCosts) {
        modelCosts.forEach(cost => {
          config.push({
            model: cost.model,
            promptTokenRate: cost.prompt_rate,
            completionTokenRate: cost.completion_rate,
            globalMultiplier,
            effectiveDate: new Date(cost.created_at)
          });
        });
      }
      
      return config;
      
    } catch (error) {
      console.error("Error in getTokenCostConfig:", error);
      return [];
    }
  }
  
  /**
   * Get the current token rate from the database with caching
   */
  async getCurrentTokenRate(): Promise<number> {
    const now = Date.now();
    // Check if we have a valid cached rate
    if (this.cachedTokenRate !== null && now - this.lastRateFetchTime < this.rateCacheValidityMs) {
      return this.cachedTokenRate;
    }
    
    try {
      // Fetch fresh rate from database
      const tokenCost = await billingService.getTokenCost();
      this.cachedTokenRate = tokenCost.rate;
      this.lastRateFetchTime = now;
      return this.cachedTokenRate;
    } catch (error) {
      console.error('Error fetching token rate:', error);
      // If we have a cached rate, use that even if expired
      if (this.cachedTokenRate !== null) {
        return this.cachedTokenRate;
      }
      // Otherwise use default
      return 0.02; // Default rate
    }
  }
  
  /**
   * Calculate the detailed cost of token usage
   */
  async calculateDetailedCost({ promptTokens, completionTokens, model }: {
    promptTokens: number;
    completionTokens: number;
    model: string;
  }): Promise<{
    promptCost: number;
    completionCost: number;
    totalCost: number;
    ratePerThousand: number;
    appliedMultiplier: number;
  }> {
    // Get rates for the model
    const modelRates = this.tokenCosts[model] || this.tokenCosts["gpt-4o-mini"] || { prompt: 0.01, completion: 0.03 };
    
    // Calculate base costs
    const promptCost = (promptTokens * modelRates.prompt) / 1000;
    const completionCost = (completionTokens * modelRates.completion) / 1000;
    const baseCost = promptCost + completionCost;
    
    // Get the global token rate and apply it as a scaling factor
    const tokenRate = await this.getCurrentTokenRate();
    const defaultRate = 0.02; // The baseline rate our hardcoded values are based on
    const rateScalingFactor = tokenRate / defaultRate;
    
    // Apply global multiplier and rate scaling
    const totalCost = baseCost * this.globalMultiplier * rateScalingFactor;
    
    // Calculate effective rate per thousand tokens
    const totalTokens = promptTokens + completionTokens;
    const ratePerThousand = totalTokens > 0
      ? (totalCost / totalTokens) * 1000
      : 0;
    
    return {
      promptCost,
      completionCost,
      totalCost,
      ratePerThousand,
      appliedMultiplier: this.globalMultiplier * rateScalingFactor
    };
  }
  
  /**
   * Calculate the cost of token usage (simplified version)
   */
  async calculateCost(tokenCount: number, model: string = "gpt-4o-mini"): Promise<number> {
    // If we don't have prompt/completion breakdown, assume 50/50 split
    const promptTokens = Math.floor(tokenCount / 2);
    const completionTokens = tokenCount - promptTokens;
    
    const result = await this.calculateDetailedCost({
      promptTokens,
      completionTokens,
      model
    });
    
    return result.totalCost;
  }
  
  /**
   * Update local storage with token count for UI display
   */
  private updateLocalTokenCount(tokens: number, cost: number): void {
    try {
      // Get current counts from local storage
      const currentCountsStr = localStorage.getItem('token_usage');
      const currentCounts = currentCountsStr ? JSON.parse(currentCountsStr) : { total: 0, cost: 0 };
      
      // Update counts
      const newCounts = {
        total: currentCounts.total + tokens,
        cost: currentCounts.cost + cost
      };
      
      // Save back to local storage
      localStorage.setItem('token_usage', JSON.stringify(newCounts));
      
    } catch (error) {
      console.error('Error updating local token count:', error);
    }
  }
  
  /**
   * Get current token usage from local storage
   */
  getLocalTokenUsage(): { total: number, cost: number } {
    try {
      const countsStr = localStorage.getItem('token_usage');
      return countsStr ? JSON.parse(countsStr) : { total: 0, cost: 0 };
    } catch (error) {
      console.error('Error getting local token usage:', error);
      return { total: 0, cost: 0 };
    }
  }
  
  /**
   * Reset local token usage counter
   */
  resetLocalTokenUsage(): void {
    console.log('Token reset functionality has been disabled for client billing purposes');
    // Intentionally empty - we no longer reset token usage to maintain accurate billing
    // localStorage.setItem('token_usage', JSON.stringify({ total: 0, cost: 0 }));
  }
}

// Export singleton instance
export const tokenTrackingService = new TokenTrackingService(); 