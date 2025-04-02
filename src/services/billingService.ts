import { supabase } from '@/integrations/supabase/client';

export interface TokenCost {
  rate: number;
  updated_at: string;
}

export interface TokenUsage {
  id: string;
  client_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

export const billingService = {
  async getTokenCost(): Promise<TokenCost> {
    try {
      const { data, error } = await supabase
        .from('token_costs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      return {
        rate: data.rate,
        updated_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching token cost:', error);
      throw new Error('Failed to fetch token cost');
    }
  },

  async updateTokenCost(newRate: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('token_costs')
        .insert([{
          rate: newRate,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating token cost:', error);
      throw new Error('Failed to update token cost');
    }
  },

  async getClientUsage(clientId: string) {
    try {
      // The clientId parameter is already the client's ID, no need to query for it
      // Just use it directly to query token_usage
      const { data: usageData, error: usageError } = await supabase
        .from('token_usage')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (usageError) throw usageError;

      return usageData || [];
    } catch (error) {
      console.error('Error fetching client usage:', error);
      throw new Error('Failed to fetch client usage');
    }
  },

  async getClientUsageByDateRange(clientId: string, startDate: Date, endDate: Date) {
    try {
      // The clientId parameter is already the client's ID, no need to query for it
      // Just use it directly to query token_usage
      const { data: usageData, error: usageError } = await supabase
        .from('token_usage')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (usageError) throw usageError;

      const usage = (usageData || []).reduce((acc, record) => {
        // Update total tokens and cost
        acc.total_tokens += record.total_tokens;
        acc.total_cost += record.cost;

        // Update usage by model
        if (!acc.usage_by_model[record.model]) {
          acc.usage_by_model[record.model] = { tokens: 0, cost: 0 };
        }
        acc.usage_by_model[record.model].tokens += record.total_tokens;
        acc.usage_by_model[record.model].cost += record.cost;

        // Update usage by service
        if (!acc.usage_by_service[record.service]) {
          acc.usage_by_service[record.service] = { tokens: 0, cost: 0 };
        }
        acc.usage_by_service[record.service].tokens += record.total_tokens;
        acc.usage_by_service[record.service].cost += record.cost;

        return acc;
      }, {
        total_tokens: 0,
        total_cost: 0,
        usage_by_model: {},
        usage_by_service: {}
      });

      return usage;
    } catch (error) {
      console.error('Error getting token usage:', error);
      throw new Error('Failed to fetch token usage');
    }
  },

  async getSystemUsage(startDate: Date, endDate: Date): Promise<{
    total_tokens: number;
    total_cost: number;
    usage_by_model: Record<string, { tokens: number; cost: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const usage = data.reduce((acc, record) => {
        // Update total tokens and cost
        acc.total_tokens += record.total_tokens;
        acc.total_cost += record.cost;

        // Update usage by model
        if (!acc.usage_by_model[record.model]) {
          acc.usage_by_model[record.model] = { tokens: 0, cost: 0 };
        }
        acc.usage_by_model[record.model].tokens += record.total_tokens;
        acc.usage_by_model[record.model].cost += record.cost;

        return acc;
      }, {
        total_tokens: 0,
        total_cost: 0,
        usage_by_model: {}
      });

      return usage;
    } catch (error) {
      console.error('Error fetching system usage:', error);
      throw new Error('Failed to fetch system usage');
    }
  }
};
