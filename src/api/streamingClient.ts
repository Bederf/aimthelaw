/**
 * Streaming API Client for the AI Law Assistant
 * Extends the regular API client with streaming capabilities
 */

// Import types - these will be available after running the type generation script
import { 
  AIQueryRequest, 
  AIResponse
} from '../types/api-types';

// Base API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Response chunk interface for streaming responses
 */
export interface ResponseChunk {
  content?: string;
  done?: boolean;
  is_general_chat?: boolean;
  type?: string; // Add type field for welcome and complete messages
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
    similarity_score?: number;
  }>;
  error?: string;
}

export class StreamingClient {
  private baseUrl: string;
  private authToken: string | null;
  private isStreamingSupported: boolean;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
    this.authToken = localStorage.getItem('auth_token');
    this.isStreamingSupported = true; // Assume streaming is supported by default
  }

  /**
   * Stream a query to the AI service
   * @param requestData The query request data
   */
  async *streamQueryAI(requestData: AIQueryRequest): AsyncGenerator<ResponseChunk, void, unknown> {
    try {
      console.log('Using streaming API endpoint with document references:');
      console.log('- Documents:', requestData.documents);
      console.log('- Document count:', requestData.documents?.length || 0);
      console.log('- RAG enabled:', requestData.use_rag);
      console.log('- Has system prompt:', !!requestData.system_prompt);
      
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      // Adapt the request format to match what the backend expects
      const adaptedRequest = {
        query: requestData.query,
        client_id: requestData.client_id,
        document_id: requestData.document_id || (requestData.documents && requestData.documents.length === 1 ? requestData.documents[0] : null),
        documents: requestData.documents || [],
        use_rag: requestData.use_rag !== undefined ? requestData.use_rag : true,
        max_tokens: requestData.max_tokens,
        system_prompt: requestData.system_prompt,
        model: requestData.model,
        conversation_id: requestData.conversation_id,
        conversation_history: requestData.conversation_history
      };
      
      console.log('Sending streaming request with payload:', JSON.stringify({
        query: adaptedRequest.query,
        client_id: adaptedRequest.client_id,
        document_count: adaptedRequest.documents?.length || 0,
        use_rag: adaptedRequest.use_rag,
        model: adaptedRequest.model,
        has_system_prompt: !!adaptedRequest.system_prompt
      }));
      
      // Make the request
      const response = await fetch(`${this.baseUrl}/streaming/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(adaptedRequest),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to get streaming response' }));
        throw new Error(errorData.detail || 'Failed to get streaming response');
      }
      
      // Get the reader from the response body stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }
      
      // Create a decoder for the stream
      const decoder = new TextDecoder();
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Split the chunk by lines
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              // Parse the JSON data
              const data = JSON.parse(line.slice(6));
              
              // Handle welcome message
              if (data.type === 'welcome' || data.type === 'complete') {
                yield {
                  content: data.content,
                  type: data.type,
                  done: true
                };
                continue;
              }
              
              // Handle normal streaming chunks
              yield {
                content: data.content,
                done: data.done || false,
                sources: data.sources,
                is_general_chat: data.is_general_chat,
                error: data.error
              };
              
              // If this is the final chunk, break
              if (data.done) {
                break;
              }
            } catch (e) {
              console.error('Error parsing streaming chunk:', e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      yield {
        error: error instanceof Error ? error.message : String(error),
        done: true
      };
    }
  }
  
  /**
   * Get query suggestions as the user types
   * @param requestData The partial query for suggestions
   * @returns A promise with suggested improved queries
   */
  async getQuerySuggestions(requestData: AIQueryRequest): Promise<string[]> {
    // Since there's no suggestions endpoint, generate some basic suggestions
    const suggestions = [
      `Analyze legal implications of ${requestData.query}`,
      `What are the risks associated with ${requestData.query}?`,
      `Legal precedents related to ${requestData.query}`
    ];
    
    return suggestions;
  }
}

export default new StreamingClient(); 