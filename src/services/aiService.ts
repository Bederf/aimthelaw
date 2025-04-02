/**
 * Consolidated AI Service
 * 
 * This service combines functionality from ModernAIService and UnifiedAIService
 * with enhanced caching, better progress indicators, and optimized performance.
 */

import { Message, MessageRole, MessageSender } from '@/types/ai';
import { loggingService } from './loggingService';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { AIQueryRequest, AIResponse, DateExtractionResponse } from '@/types/api-types';
import { v4 as uuidv4 } from 'uuid';

// Cache configuration
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds
const DOCUMENT_CACHE_SIZE = 50; // Maximum number of documents to cache

// Progress tracking states
export enum ProcessState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  FETCHING_DOCUMENTS = 'fetching_documents',
  PROCESSING_QUERY = 'processing_query',
  GENERATING_RESPONSE = 'generating_response',
  GENERATING_TTS = 'generating_tts',
  SAVING_CONVERSATION = 'saving_conversation',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface ProcessProgress {
  state: ProcessState;
  progress?: number; // 0-100
  detail?: string;
  error?: string;
}

export interface AIProcessingOptions {
  forceDocumentAnalysis?: boolean;
  skipSemanticSearch?: boolean;
  analyzeFullDocument?: boolean;
  isQuickAction?: boolean;
  customSystemPrompt?: string;
  includeDocumentContent?: boolean;
  progressCallback?: (progress: ProcessProgress) => void;
  trainingDocumentIds?: string[]; // Optional training document IDs to include for specific actions
}

// Document cache interface
interface DocumentCacheEntry {
  content: string;
  timestamp: number;
}

export class AIService {
  private clientId: string;
  private apiUrl: string;
  // Cache for document content to reduce redundant API calls
  private documentCache: Map<string, DocumentCacheEntry> = new Map();
  // For tracking API operations in progress
  private activeRequests: Map<string, AbortController> = new Map();

  constructor(clientId: string) {
    // Public pages may not have a client ID - use a default guest ID if empty
    if (!clientId || clientId === '') {
      console.log('No client ID provided, using default guest ID for public pages');
      this.clientId = '00000000-0000-0000-0000-000000000000'; // Default guest ID
      this.apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      console.log('AIService initialized with default guest ID');
      console.log('API URL:', this.apiUrl);
      return;
    }

    // Validate client ID format for non-public pages
    if (!clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('Invalid client ID format provided to AIService:', clientId);
      throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
    }
    
    this.clientId = clientId;
    this.apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    console.log('AIService initialized with client ID:', clientId);
    console.log('API URL:', this.apiUrl);
  }

  // Get the current access token from supabase
  async getAccessToken(): Promise<string> {
    // Check if we're on a public page that doesn't require authentication
    const isPublicPage = window.location.pathname === '/' || 
                       window.location.pathname === '/login' ||
                       window.location.pathname.startsWith('/public');
    
    // Check if we have a valid client ID - if not, this might be a public page or error situation
    if (!this.clientId || this.clientId === 'unknown') {
      console.log('No valid client ID - returning empty token');
      return '';
    }
                       
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        // Don't throw errors on public pages or when no client ID is provided
        if (isPublicPage || !this.clientId) {
          console.log('Not authenticated, but on public page or no client ID - returning empty token');
          return '';
        }
        throw new Error('Not authenticated');
      }
      
      return data.session.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      
      // If we're on a public page, return empty string instead of throwing
      if (isPublicPage) {
        console.log('Error in authentication, but on public page - returning empty token');
        return '';
      }
      
      throw error;
    }
  }

  // Generate a unique request ID
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  // Enhanced document content caching
  private async getDocumentContent(documentId: string, forceRefresh: boolean = false): Promise<string> {
    // Check cache first if not forcing refresh
    if (!forceRefresh && this.documentCache.has(documentId)) {
      const cachedEntry = this.documentCache.get(documentId)!;
      const now = Date.now();
      
      // Check if cache entry is still valid
      if (now - cachedEntry.timestamp < CACHE_EXPIRY) {
        console.log(`Using cached content for document ${documentId}`);
        return cachedEntry.content;
      } else {
        console.log(`Cache expired for document ${documentId}, fetching fresh content`);
        this.documentCache.delete(documentId);
      }
    }
    
    // Fetch document content from API
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `${this.apiUrl}/api/documents/${documentId}/content?client_id=${this.clientId}`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document content (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.content || '';
      
      // Cache the result
      this.documentCache.set(documentId, {
        content,
        timestamp: Date.now()
      });
      
      // Manage cache size by removing oldest entries if needed
      if (this.documentCache.size > DOCUMENT_CACHE_SIZE) {
        const oldestKey = this.findOldestCacheEntry();
        if (oldestKey) {
          this.documentCache.delete(oldestKey);
        }
      }
      
      return content;
    } catch (error) {
      console.error(`Error fetching content for document ${documentId}:`, error);
      throw error;
    }
  }
  
  // Find the oldest cache entry to remove when cache is full
  private findOldestCacheEntry(): string | null {
    let oldestTimestamp = Date.now();
    let oldestKey = null;
    
    for (const [key, entry] of this.documentCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  // Check if a message is conversational (doesn't need extensive document context)
  private isConversationalQuery(query: string): boolean {
    // Common greeting patterns
    const simpleGreetingPatterns = [
      "hello", "hi there", "hey", "good morning", "good afternoon", 
      "good evening", "good day", "greetings", "how are you"
    ];
    
    // General conversational patterns
    const generalConversationPatterns = [
      "thanks", "thank you", "appreciate", "got it", "understood",
      "can you", "would you", "could you", "please help", "i need",
      "what is", "how do", "how can", "how about", "tell me about",
      "explain", "describe", "show me", "give me", "help me with",
      "that's great", "sounds good", "nice", "awesome", "wonderful",
      "i agree", "i understand", "makes sense", "okay", "ok"
    ];
    
    const queryLower = query.toLowerCase().trim();
    
    // Check for simple greetings
    for (const pattern of simpleGreetingPatterns) {
      if (queryLower === pattern || queryLower.startsWith(pattern + ' ') || queryLower.endsWith(' ' + pattern)) {
        return true;
      }
    }
    
    // Check for general conversational patterns
    for (const pattern of generalConversationPatterns) {
      if (queryLower.includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }

  // Track analytics events - for future implementation 
  private async trackAnalytics(eventData: any, clientId: string): Promise<void> {
    // Temporarily disabled analytics
    return;
  }

  async createConversation(title?: string): Promise<string> {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        client_id: this.clientId,
        title: title || 'New Conversation',
        status: 'active'
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async saveMessage(conversationId: string, message: Message): Promise<void> {
    const { error } = await supabase
      .from('conversation_messages')
      .insert([{
        conversation_id: conversationId,
        content: message.content,
        role: message.role,
        metadata: message.metadata || {}
      }]);

    if (error) throw error;
  }

  async getTrainingInfo(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('legal_knowledge')
        .select('content, level, metadata, file_id')
        .limit(20);
      
      if (error) {
        console.error('Error fetching training info:', error);
        return [];
      }
      
      // Transform the data to match the expected format
      const transformedData = (data || []).map(item => ({
        content: item.content,
        level: item.level,
        metadata: item.metadata || {},
        source: `Legal Knowledge (${item.file_id || 'unknown'})`
      }));
      
      return transformedData;
    } catch (err) {
      console.error('Exception fetching training info:', err);
      return [];
    }
  }

  /**
   * Send a message to the AI service with document context
   */
  async sendMessage(
    message: string,
    documentIds: string[],
    model: string = 'gpt-4',
    conversationId: string | null = null,
    previousMessages: Message[] = [],
    options: AIProcessingOptions = {}
  ) {
    const { progressCallback } = options;
    
    // Initialize progress
    if (progressCallback) {
      progressCallback({
        state: ProcessState.INITIALIZING,
        progress: 0,
        detail: 'Initializing conversation'
      });
    }
    
    console.log('AIService.sendMessage called with:', { 
      message, 
      documentIds: documentIds.length, 
      model, 
      conversationId, 
      previousMessagesCount: previousMessages.length,
      hasCustomPrompt: !!options.customSystemPrompt,
      includeDocumentContent: options.includeDocumentContent
    });
    
    // Validate input parameters
    if (!message || typeof message !== 'string') {
      console.error('Invalid message parameter:', message);
      throw new Error('Invalid message parameter');
    }
    
    if (!Array.isArray(documentIds)) {
      console.error('documentIds is not an array:', documentIds);
      documentIds = [];
    }
    
    try {
      // Create new conversation if none exists
      if (!conversationId) {
        if (progressCallback) {
          progressCallback({
            state: ProcessState.INITIALIZING,
            progress: 10,
            detail: 'Creating new conversation'
          });
        }
        
        console.log('No conversation ID provided, creating a new one');
        conversationId = await this.createConversation();
        console.log('Created new conversation:', conversationId);
      } else {
        console.log('Using existing conversation:', conversationId);
      }

      // Save user message
      const userMessage: Message = {
        id: uuidv4(),
        content: message,
        role: MessageRole.USER,
        sender: MessageSender.USER,
        timestamp: new Date()
      };
      
      if (progressCallback) {
        progressCallback({
          state: ProcessState.SAVING_CONVERSATION,
          progress: 20,
          detail: 'Saving user message'
        });
      }
      
      await this.saveMessage(conversationId, userMessage);
      console.log('Saved user message to conversation:', conversationId);

      // Get authorization token
      const token = await this.getAccessToken();
      console.log('Got auth token:', token ? 'Valid token' : 'No token');
      
      // Fetch training info if needed for enhanced context
      if (progressCallback) {
        progressCallback({
          state: ProcessState.FETCHING_DOCUMENTS,
          progress: 30,
          detail: 'Retrieving document context'
        });
      }
      
      // Check if this is a quick action or conversational query
      const isQuickAction = options.isQuickAction === true;
      const isConversational = this.isConversationalQuery(message);
      
      // Fetch training info from Supabase and prepare a training text
      const trainingInfo = await this.getTrainingInfo();
      let trainingText = '';
      
      if (!isQuickAction && !isConversational && trainingInfo.length > 0) {
        // Limit the length of trainingText for efficiency
        trainingText = trainingInfo.map(info => info.content).join('\n\n');
        if(trainingText.length > 2000) {
          trainingText = trainingText.substring(0,2000) + '...';
        }
      }

      // Construct system prompt including training info
      let systemPrompt = options.customSystemPrompt;

      // If no custom prompt is provided, use the default one
      if (!systemPrompt) {
        systemPrompt = `You are a legal AI assistant with access to three types of information:\n\n` +
          `1. Legal Knowledge Base - laws and legal acts that form your foundation\n` +
          `2. User-Provided Documents - specific files selected by the user\n` +
          `3. Training Information - additional legal training content:\n${trainingText}\n\n` +
          `When answering:\n` +
          `- Always identify your sources (e.g., "Based on the Legal Knowledge Base..." or "According to your document...")\n` +
          `- When referencing documents, mention them specifically\n` +
          `- Explain legal concepts from the Legal Knowledge Base and the training information when relevant to the documents\n` +
          `- Be clear about the limitations of your advice\n` +
          `- Maintain context from the conversation history and previously analyzed documents`;
      }

      // Format previous messages for the API
      const formattedPreviousMessages = previousMessages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content
      }));

      console.log('Sending conversation history with', formattedPreviousMessages.length, 'previous messages');
      console.log('Using conversation_id for LangChain memory:', conversationId);

      if (progressCallback) {
        progressCallback({
          state: ProcessState.PROCESSING_QUERY,
          progress: 50,
          detail: 'Processing query with AI'
        });
      }
      
      // Generate a unique ID for this request
      const requestId = this.generateRequestId();
      
      // Create an AbortController for this request
      const abortController = new AbortController();
      this.activeRequests.set(requestId, abortController);
      
      try {
        // Make API request
        console.log('Making fetch request to API endpoint');
        const response = await fetch(`${this.apiUrl}/api/query/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: message,
            client_id: this.clientId,
            documents: documentIds,
            use_rag: true,
            system_prompt: systemPrompt,
            model: model,
            conversation_id: conversationId,
            conversation_history: formattedPreviousMessages,
            prepare_for_tts: isQuickAction, // Enable TTS for quick actions
            summarize_response: isQuickAction, // Enable summarization for quick actions
            skip_training_data: true // Only use explicitly selected documents
          }),
          signal: abortController.signal
        });

        // Clean up the abort controller
        this.activeRequests.delete(requestId);
        
        // Progress update
        if (progressCallback) {
          progressCallback({
            state: ProcessState.GENERATING_RESPONSE,
            progress: 80,
            detail: 'Finalizing response'
          });
        }

        // Log the response status for debugging
        console.log('AI query response status:', response.status);

        if (!response.ok) {
          // Handle error response
          console.error('Response not OK, status:', response.status);
          let errorDetail = "Unknown error";
          try {
            const errorJson = await response.json();
            errorDetail = errorJson.detail || JSON.stringify(errorJson);
          } catch (e) {
            try {
              errorDetail = await response.text();
            } catch (textError) {
              errorDetail = `HTTP Error: ${response.status}`;
            }
          }
          
          console.error('AI query error detail:', errorDetail);
          
          if (progressCallback) {
            progressCallback({
              state: ProcessState.ERROR,
              detail: errorDetail
            });
          }
          
          if (response.status === 401) {
            throw new Error('Authentication failed. Please refresh the page and try again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
          } else {
            throw new Error(`Failed to get AI response: ${errorDetail}`);
          }
        }

        // Process successful response
        console.log('Response OK, parsing JSON');
        const result = await response.json();
        console.log('Parsed response JSON:', result);

        if (!result.response) {
          console.error('Response missing expected "response" field:', result);
          throw new Error('Invalid response format from AI service');
        }

        // Create and save AI message
        console.log('Creating AI message from response');
        const aiMessage: Message = {
          id: uuidv4(),
          content: result.response,
          role: MessageRole.ASSISTANT,
          sender: MessageSender.AI,
          timestamp: new Date(),
          metadata: {
            token_usage: result.token_usage,
            cost: result.cost,
            sources: result.sources || result.citations
          }
        };
        
        // Final progress update
        if (progressCallback) {
          progressCallback({
            state: ProcessState.SAVING_CONVERSATION,
            progress: 90,
            detail: 'Saving AI response'
          });
        }
        
        await this.saveMessage(conversationId, aiMessage);
        console.log('Saved AI message to conversation');
        
        if (progressCallback) {
          progressCallback({
            state: ProcessState.COMPLETE,
            progress: 100,
            detail: 'Completed successfully'
          });
        }

        // Return the result
        return {
          message: aiMessage,
          conversation_id: conversationId,
          token_usage: result.token_usage,
          cost: result.cost,
          sources: result.sources || result.citations || [],
          audio_url: result.audio_url
        };
      } finally {
        // Clean up the abort controller if it's still in the map
        if (this.activeRequests.has(requestId)) {
          this.activeRequests.delete(requestId);
        }
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      if (progressCallback) {
        progressCallback({
          state: ProcessState.ERROR,
          detail: error.message || 'An unexpected error occurred'
        });
      }
      
      throw error;
    }
  }

  /**
   * Cancel an ongoing request
   */
  cancelRequest(requestId: string): boolean {
    if (this.activeRequests.has(requestId)) {
      const controller = this.activeRequests.get(requestId)!;
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Handle quick actions like document analysis, date extraction, etc.
   */
  async handleQuickAction(
    action: string,
    documentIds: string[],
    model: string = 'gpt-4',
    options: AIProcessingOptions = {}
  ): Promise<any> {
    const { progressCallback } = options;
    
    if (progressCallback) {
      progressCallback({
        state: ProcessState.INITIALIZING,
        progress: 0,
        detail: `Initializing ${action}`
      });
    }
    
    try {
      console.log("[handleQuickAction] Starting", action, "with:", {
        documentCount: documentIds.length,
        model: model
      });

      // Exit early if no documents provided for document-dependent actions
      if (!documentIds || documentIds.length === 0) {
        console.error(`[handleQuickAction] No documents provided for ${action}`);
        const errorResult = {
          content: `## Error: No Documents Selected\n\nPlease select at least one document to perform the "${action}" action.`,
          response: `## Error: No Documents Selected\n\nPlease select at least one document to perform the "${action}" action.`,
        };

        if (progressCallback) {
          progressCallback({
            state: ProcessState.ERROR,
            detail: 'No documents selected'
          });
        }

        return errorResult;
      }

      // Map action to backend action type and generate appropriate query
      const actionTypeMap: Record<string, string> = {
        "Extract Dates": "extract_dates",
        "Summarize Document": "summarize",
        "Reply to Letter": "reply_to_letter",
        "Prepare for Court": "prepare_for_court"
      };
      
      const actionType = actionTypeMap[action] || action.toLowerCase().replace(/\s+/g, '_');
      
      // Generate appropriate query based on action type
      let query = "";
      switch (action) {
        case "Extract Dates":
          query = "Please extract all important dates from the selected documents and explain their significance.";
          break;
        case "Summarize Document":
          query = "Please provide a comprehensive summary of the selected documents, highlighting key points.";
          break;
        case "Reply to Letter":
          query = "Please help me write a professional response to this letter.";
          break;
        case "Prepare for Court":
          query = "Please help me prepare for court proceedings based on these documents.";
          break;
        default:
          query = `Please perform ${action} on the selected documents.`;
      }
      
      if (progressCallback) {
        progressCallback({
          state: ProcessState.FETCHING_DOCUMENTS,
          progress: 20,
          detail: 'Validating document access'
        });
      }

      // Get token for API authentication
      const token = await this.getAccessToken();
      
      // Create a unique ID for this request
      const requestId = this.generateRequestId();
      const abortController = new AbortController();
      this.activeRequests.set(requestId, abortController);
      
      try {
        if (progressCallback) {
          progressCallback({
            state: ProcessState.PROCESSING_QUERY,
            progress: 40,
            detail: `Processing ${action} request`
          });
        }
        
        // For specialized endpoints
        if (actionType === "extract_dates") {
          // Date extraction endpoint
          const response = await fetch(`${this.apiUrl}/api/extract_dates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              documents: documentIds,
              client_id: this.clientId,
              model: model,
              skip_training_data: true,
              content: "" // Add empty content to satisfy validation, backend will fetch content from documents
            }),
            signal: abortController.signal
          });
          
          if (!response.ok) {
            console.error(`Date extraction failed with status ${response.status}`);
            let errorDetail;
            
            try {
              // Try to get more detailed error information
              const errorJson = await response.json();
              
              // Enhanced error handling for validation errors (422)
              if (response.status === 422 && errorJson.detail) {
                if (Array.isArray(errorJson.detail)) {
                  // Format array of validation errors
                  errorDetail = errorJson.detail.map((err: any) => 
                    `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg || JSON.stringify(err)}`
                  ).join('; ');
                } else {
                  // String or object detail
                  errorDetail = typeof errorJson.detail === 'string' 
                    ? errorJson.detail 
                    : JSON.stringify(errorJson.detail);
                }
                console.error('Validation error detail:', errorDetail);
                throw new Error(`Date extraction validation error: ${errorDetail}`);
              } else {
                errorDetail = errorJson.detail || JSON.stringify(errorJson);
              }
              
              console.error('Error detail:', errorDetail);
            } catch (e) {
              // If JSON parsing fails, use status text
              errorDetail = response.statusText;
              console.error('Error parsing error response:', e);
            }
            
            throw new Error(`Date extraction failed: ${response.status} ${errorDetail}`);
          }
          
          const result = await response.json();
          
          if (progressCallback) {
            progressCallback({
              state: ProcessState.COMPLETE,
              progress: 100,
              detail: 'Date extraction complete'
            });
          }
          
          // Format the result with Markdown for better readability
          let formattedResponse = result.formatted_response || result.response;
          
          // If no formatted response exists, create one
          if (!formattedResponse) {
            formattedResponse = "## Extracted Dates\n\n";
            
            if (result.dates && result.dates.length > 0) {
              result.dates.forEach(date => {
                formattedResponse += `### ${date.date}\n`;
                if (date.event) {
                  formattedResponse += `**Event:** ${date.event}\n\n`;
                }
                if (date.context) {
                  formattedResponse += `**Context:** ${date.context}\n\n`;
                }
                if (date.source_document) {
                  formattedResponse += `**Source:** Document ID ${date.source_document}\n\n`;
                }
                formattedResponse += '---\n\n';
              });
            } else {
              formattedResponse += "No dates were found in the selected documents.";
            }
          }
          
          return {
            content: formattedResponse,
            dates: result.dates || [],
            token_usage: result.token_usage,
            cost: result.cost
          };
        } else {
          // General quick action using unified query endpoint
          const response = await fetch(`${this.apiUrl}/api/query/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              query: query,
              client_id: this.clientId,
              documents: documentIds,
              conversation_id: null,
              model: model,
              search_mode: 'direct',
              skip_embedding_generation: true,
              force_use_stored_embeddings: true,
              use_existing_embeddings: true,
              prepare_for_tts: true,
              summarize_response: true,
              action_type: actionType,
              skip_training_data: true, // Only use explicitly selected documents
              training_documents: options.trainingDocumentIds || [] // Include specific training documents if provided
            }),
            signal: abortController.signal
          });
          
          if (!response.ok) {
            throw new Error(`Quick action failed: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (progressCallback) {
            progressCallback({
              state: ProcessState.GENERATING_TTS,
              progress: 80,
              detail: 'Generating audio response'
            });
          }
          
          // Wait for TTS generation if applicable
          if (result.audio_status === 'processing' && result.audio_job_id) {
            let audioUrl = null;
            let retries = 0;
            const maxRetries = 10;
            
            while (!audioUrl && retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries++;
              
              const audioCheckResponse = await fetch(`${this.apiUrl}/api/tts/status/${result.audio_job_id}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (audioCheckResponse.ok) {
                const audioStatus = await audioCheckResponse.json();
                if (audioStatus.status === 'completed' && audioStatus.url) {
                  audioUrl = audioStatus.url;
                  break;
                }
              }
              
              if (progressCallback) {
                progressCallback({
                  state: ProcessState.GENERATING_TTS,
                  progress: 80 + Math.floor((retries / maxRetries) * 15),
                  detail: `Generating audio response (${retries}/${maxRetries})`
                });
              }
            }
            
            // Add audio URL to result if found
            if (audioUrl) {
              result.audio_url = audioUrl;
            }
          }
          
          if (progressCallback) {
            progressCallback({
              state: ProcessState.COMPLETE,
              progress: 100,
              detail: `${action} complete`
            });
          }
          
          return {
            content: result.response,
            token_usage: result.token_usage,
            cost: result.cost,
            sources: result.sources || result.citations || [],
            audio_url: result.audio_url
          };
        }
      } finally {
        // Clean up the abort controller
        if (this.activeRequests.has(requestId)) {
          this.activeRequests.delete(requestId);
        }
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      
      if (progressCallback) {
        progressCallback({
          state: ProcessState.ERROR,
          detail: error.message || `An error occurred during ${action}`
        });
      }
      
      // Determine error type for more specific messaging
      let errorTitle = `Error Processing ${action}`;
      let errorMessage = error.message || "Unknown error";
      
      if (error.message?.includes('validation error')) {
        errorTitle = `${action} Validation Error`;
      } else if (error.message?.includes('timeout')) {
        errorTitle = `${action} Timeout`;
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorTitle = `Authentication Error`;
      }
      
      // Return a user-friendly error with markdown formatting
      return {
        content: `## ${errorTitle}\n\nThere was an error processing your request: ${errorMessage}`,
        response: `## ${errorTitle}\n\nThere was an error processing your request: ${errorMessage}`,
        error: true
      };
    }
  }

  /**
   * Extract dates from documents
   */
  async extractDates(documentIds: string[], model: string = 'gpt-4', options: AIProcessingOptions = {}): Promise<any> {
    // Validate document IDs
    if (!documentIds || documentIds.length === 0) {
      throw new Error('At least one document must be selected for date extraction');
    }
    
    // Ensure all documentIds are valid strings
    const validDocumentIds = documentIds.filter(id => typeof id === 'string' && id.trim().length > 0);
    
    if (validDocumentIds.length === 0) {
      throw new Error('No valid document IDs provided for date extraction');
    }
    
    return this.handleQuickAction('Extract Dates', validDocumentIds, model, options);
  }

  /**
   * Generate legal summary
   */
  async generateLegalSummary(documentIds: string[], model: string = 'gpt-4', options: AIProcessingOptions = {}): Promise<any> {
    return this.handleQuickAction('Summarize Document', documentIds, model, options);
  }

  /**
   * Prepare for court
   */
  async prepareCourt(documentIds: string[], model: string = 'gpt-4o-mini', options: AIProcessingOptions = {}): Promise<any> {
    return this.handleQuickAction('Prepare for Court', documentIds, model, options);
  }

  /**
   * Reply to letter
   */
  async replyToLetter(documentIds: string[], model: string = 'gpt-4', options: AIProcessingOptions = {}): Promise<any> {
    return this.handleQuickAction('Reply to Letter', documentIds, model, options);
  }

  /**
   * Clear the document cache
   */
  clearCache(): void {
    this.documentCache.clear();
    console.log('Document cache cleared');
  }
}

// Create singleton instance
export const aiService = new AIService(import.meta.env.VITE_DEFAULT_CLIENT_ID || '');

export default AIService; 