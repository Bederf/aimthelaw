
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

export interface AIQueryRequest {
  query: string;
  client_id: string;
  documents?: string[];
  use_rag?: boolean;
  max_tokens?: number;
  system_prompt?: string;
  model?: string;
  conversation_id?: string;
  previous_messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  response: string;
  citations?: string[];
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamingCallbacks {
  onMessage: (message: string) => void;
  onDone: (response: AIResponse) => void;
  onError: (error: Error) => void;
}

export class LegalApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders() {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      let errorDetail = `Failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    return response.json();
  }

  async queryAI(request: AIQueryRequest): Promise<AIResponse> {
    return this.fetchWithAuth('/api/query', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async streamQuery(request: AIQueryRequest, callbacks: StreamingCallbacks) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/stream_query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completeResponse: AIResponse = { response: '' };

      const processChunk = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            callbacks.onDone(completeResponse);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete line delimited chunks
          let lineEnd;
          while ((lineEnd = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 1);
            
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                if (data.error) {
                  callbacks.onError(new Error(data.error));
                  return;
                }
                
                if (data.content) {
                  callbacks.onMessage(data.content);
                  completeResponse.response += data.content;
                }
                
                // If metadata is present in the completion
                if (data.token_usage) {
                  completeResponse.token_usage = data.token_usage;
                }
                
                if (data.citations) {
                  completeResponse.citations = data.citations;
                }
              } catch (e) {
                console.warn('Failed to parse streaming response chunk', e);
              }
            }
          }
          
          processChunk();
        } catch (error) {
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }
      };

      processChunk();
      
      // Return a function to cancel the stream
      return {
        abort: () => {
          reader.cancel();
        }
      };
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return {
        abort: () => {}
      };
    }
  }

  async getAvailableModels() {
    return this.fetchWithAuth('/api/models');
  }

  async createConversation(clientId: string) {
    return this.fetchWithAuth('/api/create-conversation', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId })
    });
  }

  async extractInsights(clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/extract-insights', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }

  async extractDates(clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/extract-dates', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }

  async summarizeDocuments(clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }

  async generateLetterReply(clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/reply-to-letter', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }

  async prepareForCourt(clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/prepare-for-court', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }

  async executeQuickAction(actionType: string, clientId: string, documentIds: string[]) {
    return this.fetchWithAuth('/api/quick-action', {
      method: 'POST',
      body: JSON.stringify({
        action_type: actionType,
        client_id: clientId,
        document_ids: documentIds
      })
    });
  }
}

// Export a singleton instance
export const legalApi = new LegalApiClient();
