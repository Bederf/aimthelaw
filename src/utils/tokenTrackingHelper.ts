import { tokenTrackingService } from '@/services/tokenTrackingService';

/**
 * Parameters for tracking token usage
 */
export interface TokenUsageParams {
  clientId: string;
  service: string;
  responseData?: any;  // API response data that might contain token_usage
  model?: string;
  fallbackEstimation?: {
    contentSize: number;  // Size in bytes/chars
    charsPerToken?: number;  // Default: 4
    completionRatio?: number;  // Default: 0.2 (20% of total)
  };
  metadata?: Record<string, any>;
}

/**
 * Centralized function to track token usage across the application
 * 
 * This function handles both actual token usage from API responses
 * and estimated token usage based on content size when actual data
 * is not available.
 */
export async function trackTokenUsage({
  clientId,
  service,
  responseData,
  model = 'gpt-4',
  fallbackEstimation,
  metadata = {}
}: TokenUsageParams): Promise<void> {
  // Try to extract token usage from API response
  if (responseData?.token_usage) {
    console.log(`${service} token usage:`, responseData.token_usage);
    
    // Record actual token usage
    await tokenTrackingService.recordTokenUsage({
      clientId,
      promptTokens: responseData.token_usage.prompt_tokens || 0,
      completionTokens: responseData.token_usage.completion_tokens || 0,
      model: responseData.token_usage.model || model,
      service,
      metadata: {
        ...metadata,
        is_estimated: false
      }
    });
    return;
  }
  
  // Fall back to estimation if needed and params provided
  if (fallbackEstimation) {
    const charsPerToken = fallbackEstimation.charsPerToken || 4;
    const completionRatio = fallbackEstimation.completionRatio || 0.2;
    
    const estimatedTokens = Math.ceil(fallbackEstimation.contentSize / charsPerToken);
    const promptTokens = Math.round(estimatedTokens * (1 - completionRatio));
    const completionTokens = Math.round(estimatedTokens * completionRatio);
    
    console.log(`Estimated ${service} token usage: ${estimatedTokens} tokens`);
    
    // Record estimated token usage
    await tokenTrackingService.recordTokenUsage({
      clientId,
      promptTokens,
      completionTokens,
      model,
      service,
      metadata: {
        ...metadata,
        is_estimated: true
      }
    });
  }
} 