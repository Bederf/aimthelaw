/**
 * API Type Compatibility Layer
 * 
 * This file provides a compatibility layer between our simplified API wrapper
 * and the existing API types in the codebase.
 */

import { AIResponse, AIQueryRequest, DateExtractionRequest, DateExtractionResponse } from '../types/api-types';
import * as apiWrapper from './api';

/**
 * Maps the simplified API response to the format expected by the application.
 */
export function mapToAIResponse(response: apiWrapper.AIResponse): AIResponse {
  return {
    response: response.data || '',
    token_usage: response.token_usage,
    citations: response.data?.citations || []
  };
}

/**
 * Maps the application's request format to the simplified API wrapper format.
 */
export function mapFromAIQueryRequest(request: AIQueryRequest): apiWrapper.AIQueryRequest {
  return {
    query: request.query,
    client_id: request.client_id,
    documents: request.documents,
    max_tokens: request.max_tokens
  };
}

/**
 * A compatibility layer that exposes the same interface as the original API client
 * but uses our simplified API wrapper under the hood.
 */
export const apiClient = {
  async queryAI(request: AIQueryRequest): Promise<AIResponse> {
    const mappedRequest = mapFromAIQueryRequest(request);
    const response = await apiWrapper.api.query(mappedRequest);
    
    if (!response.success) {
      throw new Error(response.error || 'Unknown error in API call');
    }
    
    return mapToAIResponse(response);
  },
  
  async extractDates(request: DateExtractionRequest): Promise<DateExtractionResponse> {
    const simplifiedRequest = {
      client_id: request.client_id,
      content: request.content,
      file_id: request.file_id
    };
    
    const response = await apiWrapper.api.extractDates(simplifiedRequest);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract dates');
    }
    
    // Return a minimal compatible response structure
    return {
      message: 'Dates extracted successfully',
      dates: response.data?.dates || [],
      structured_timeline: response.data?.structured_timeline || {},
      token_usage: response.token_usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      cost: 0,
      sources: []
    };
  },
  
  // Add more compatibility methods as needed
  
  // Streaming methods
  createStreamingClient() {
    // Return a minimal streaming client interface
    return {
      stream: async (request: AIQueryRequest) => {
        const mappedRequest = mapFromAIQueryRequest(request);
        return apiWrapper.api.streamQuery(mappedRequest);
      },
      abort: () => {
        // Implement abort if needed
      }
    };
  }
};

// Export the original API wrapper as well for new code
export { api } from './api';

// Re-export types that might be used
export type { AIResponse as SimplifiedAIResponse } from './api'; 