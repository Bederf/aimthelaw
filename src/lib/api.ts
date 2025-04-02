/**
 * API Wrapper for simplified imports
 * This file serves as a compatibility layer for components that import from @/lib/api
 */

// Import the actual API client
import { apiClient } from '../api/apiClient';

export interface AIResponse {
  success: boolean;
  data?: any;
  response?: string;
  error?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  sources?: any[];
}

export interface AIQueryRequest {
  query: string;
  client_id: string;
  documents?: string[];
  use_rag?: boolean;
  max_tokens?: number;
  system_prompt?: string;
  model?: string;
  conversation_id?: string;
  previous_messages?: Array<{ role: "user" | "assistant"; content: string; }>;
  metadata?: Record<string, any>;
}

export interface StreamingParams {
  query: string;
  client_id: string;
  documents: string[];
  use_rag?: boolean;
  max_tokens?: number;
  system_prompt?: string;
  model?: string;
  conversation_id?: string;
  previous_messages?: Array<{ role: "user" | "assistant"; content: string; }>;
  metadata?: Record<string, any>;
}

// Re-export with fixed types
export const api = {
  // AI query methods
  query: async (params: AIQueryRequest): Promise<AIResponse> => {
    try {
      return await apiClient.query(params);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
  
  streamQuery: (params: StreamingParams, callbacks: {
    onMessage: (message: string) => void;
    onDone: (response: AIResponse) => void;
    onError: (error: Error) => void;
  }) => {
    return apiClient.streamQuery(params, callbacks);
  },
  
  // Document methods
  getDocuments: async (clientId: string) => {
    try {
      return await apiClient.getClientDocuments(clientId);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  uploadDocument: async (clientId: string, file: File, options?: any) => {
    try {
      return await apiClient.uploadClientDocument(clientId, file, options);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  // Quick actions
  extractDates: async (clientId: string, documentIds: string[]) => {
    try {
      return await apiClient.extractDates(clientId, documentIds);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  summarizeDocuments: async (clientId: string, documentIds: string[]) => {
    try {
      return await apiClient.summarizeDocuments(clientId, documentIds);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  replyToLetter: async (clientId: string, documentIds: string[]) => {
    try {
      return await apiClient.replyToLetter(clientId, documentIds);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  prepareForCourt: async (clientId: string, documentIds: string[]) => {
    try {
      return await apiClient.prepareForCourt(clientId, documentIds);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default api; 