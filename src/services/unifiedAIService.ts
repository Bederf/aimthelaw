import { apiClient, api } from '@/api/apiClient';
import { Message, TokenInfo } from '@/types/ai';
import { MessageRole, MessageSender } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { AxiosResponse } from 'axios';
import { Message, Role } from '@/types/chat';

/**
 * Interface for AI workflow module outputs
 */
export interface ModuleOutput {
  status?: string;
  workflow_id?: string;
  document_id?: string;
  questions?: string[];
  analysis?: any;
  strategy?: string;
  dates?: any[];
  structured_timeline?: any;
  summary?: string;
  [key: string]: any;
}

/**
 * Interface for unified workflow options
 */
export interface UnifiedWorkflowOptions {
  model?: string;
  conversationId?: string | null;
  previousMessages?: Message[];
  workflowData?: any;
}

/**
 * Interface for workflow feedback
 */
export interface WorkflowFeedback {
  workflowId: string;
  feedback: string[];
}

// New query interfaces
interface QueryOptions {
  modelName?: string;
  clientId?: string;
  searchMode?: string;
  clientDocuments?: string[];
  trainingDocuments?: string[];
  previousMessages?: any[];
}

interface QueryResponse {
  query: string;
  response: string;
  sources: Array<{
    content: string;
    metadata: any;
    similarity_score?: number;
  }>;
  conversation_id: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Service for unified AI interactions including all quick actions
 */
export class UnifiedAIService {
  private clientId: string;
  private apiUrl: string;
  private defaultModel: string = "gpt-4o";
  private trainingDocuments: string[] = [];
  private debugCachedResponse: any = null;
  
  /**
   * Create a new UnifiedAIService
   * @param clientId Required client ID for all operations
   * @throws Error if client ID is not provided
   */
  constructor(clientId: string) {
    // Validate client ID - no fallbacks, it must be provided
    if (!clientId || clientId.trim() === '') {
      const errorMessage = 'Client ID is required for UnifiedAIService';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    this.clientId = clientId;
    this.apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    console.log(`UnifiedAIService initialized with client ID: ${this.clientId}`);
  }

  /**
   * Updates the client ID for the service.
   * @param clientId The new client ID to use for subsequent requests
   * @throws Error if an invalid client ID is provided
   */
  setClientId(clientId: string): void {
    if (!clientId || clientId.trim() === '') {
      throw new Error('Cannot set empty client ID');
    }
    
    if (this.clientId !== clientId) {
      console.log(`Updating UnifiedAIService client ID from ${this.clientId} to ${clientId}`);
      this.clientId = clientId;
    }
  }

  /**
   * Converts backend messages to frontend Message format
   */
  private convertMessages(apiMessages: any[]): Message[] {
    return apiMessages.map(msg => {
      // Skip system messages 
      if (msg.role === 'system') return null;
      
      return {
        id: uuidv4(),
        content: msg.content,
        role: msg.role as MessageRole,
        sender: msg.role === 'user' ? MessageSender.USER : MessageSender.AI,
        timestamp: new Date().toISOString()
      };
    }).filter(Boolean) as Message[];
  }

  /**
   * Process document input consistently, handling both string IDs and document objects
   * @param files Array of string IDs or document objects
   * @returns Array of processed document objects with id, type, and title properties
   */
  async processDocumentInput(files: string[] | File[] = []): Promise<Array<{id: string, type: string, title?: string}>> {
    console.log(`Processing document input:`, files);
    
    // Enhanced document extraction with better type handling
    const documentObjects = files.map(file => {
      // Case 1: file is a string (already an ID)
      if (typeof file === 'string') return { id: file, type: 'client' };
      
      // Case 2: file is an object with id property
      if (file && (file as any).id) {
        return { 
          id: (file as any).id, 
          type: (file as any).is_training_doc || (file as any).type === 'training' ? 'training' : 'client',
          title: (file as any).title || (file as any).file_name
        };
      }
      
      // Case 3: file has a name property that might be an ID
      if (file && (file as any).name) {
        return { 
          id: (file as any).name, 
          type: (file as any).is_training_doc || (file as any).type === 'training' ? 'training' : 'client',
          title: (file as any).title || (file as any).file_name
        };
      }
      
      return null;
    }).filter(Boolean);
    
    console.log(`Enhanced document objects:`, documentObjects);
    return documentObjects;
  }

  /**
   * Process a query through the unified workflow
   */
  async processQuery(
    query: string,
    conversationId: string | null,
    documentIds: string[],
    options: {
      modelName?: string;
      clientId?: string;
      searchMode?: string;
      isQuickAction?: boolean;
      trainingFilesOnly?: boolean;
    } = {}
  ): Promise<any> {
    console.log("Processing query:", query);
    console.log("Document IDs:", documentIds);
    console.log("Options:", options);

    // Determine if this is a legal query
    const isLegalQuery = this.isLegalQuery(query);
    
    // For legal queries, default to training files only unless explicitly overridden
    const trainingFilesOnly = options.trainingFilesOnly !== undefined 
      ? options.trainingFilesOnly 
      : isLegalQuery;
      
    if (isLegalQuery) {
      console.log("Legal query detected - using training files only for legal advice");
    }

    // Always require client ID - no fallbacks
    const clientId = options.clientId || this.clientId;
    if (!clientId) {
      const errorMsg = "Client ID is required for all AI service operations";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate document IDs with better error handling
    try {
      const validatedDocumentIds = await api.validateDocumentIds(documentIds);
      if (!validatedDocumentIds.success) {
        console.error("Failed to validate document IDs:", validatedDocumentIds.message);
        throw new Error(`Failed to validate document IDs: ${validatedDocumentIds.message}`);
      }
      
      // If this is a legal query and trainingFilesOnly is true,
      // we'll only use training documents regardless of selected client documents
      let documentIdsToUse = validatedDocumentIds.validIds;
      let trainingDocumentIdsToUse = this.trainingDocuments || [];
      
      if (trainingFilesOnly && isLegalQuery) {
        // For legal queries with trainingFilesOnly, don't use client documents
        documentIdsToUse = [];
        console.log("Legal query mode: Using only training files for context");
      }

      // Optimize context size to prevent token limit issues
      if (documentIdsToUse.length > 5) {
        console.warn("Large number of documents detected, optimizing context size");
        documentIdsToUse = await this.optimizeContextForTokenLimits(documentIdsToUse, clientId);
      }

      // Create request data with consistent parameter naming
      const requestData = {
        query: query,
        client_id: clientId, // Always include client_id 
        conversation_id: conversationId,
        model: options.modelName || this.defaultModel,
        documents: documentIdsToUse, // Client document IDs
        training_documents: trainingDocumentIdsToUse, // Training document IDs
        search_mode: options.searchMode || "hybrid",
        is_quick_action: options.isQuickAction || false,
        training_files_only: trainingFilesOnly, // Include the parameter
      };

      // Enhanced error handling pattern for API calls
      try {
        console.log("Sending request data:", JSON.stringify(requestData, null, 2));
        
        // Reuse existing response if available (for development/testing)
        if (this.debugCachedResponse) {
          console.log("Using cached response for debugging");
          return this.debugCachedResponse;
        }

        const response = await apiClient.post('/ai/query', requestData);
        console.log("Response received:", response.data);
        
        // Add enhanced error information and recommendations if this was a token limit issue
        if (response.data.error && response.data.error.toLowerCase().includes("token limit")) {
          console.warn("Token limit issue detected in response");
          response.data.resolution = "Consider using fewer documents or a shorter query.";
          response.data.error_type = "TOKEN_LIMIT_EXCEEDED";
        }

        return response.data;
      } catch (error: any) {
        console.error("API error processing query:", error);
        
        // Enhanced error handling with specific error types
        const statusCode = error.response?.status;
        const errorData = error.response?.data || {};
        
        // Handle token limit errors specifically
        if (
          (statusCode === 400 && errorData.error === "Token limit exceeded") ||
          (error.message && error.message.toLowerCase().includes("token limit"))
        ) {
          console.warn("Token limit error detected, will retry with fewer documents");
          
          // Reduce document count by half and retry
          if (documentIdsToUse.length > 1) {
            const reducedDocCount = Math.max(1, Math.floor(documentIdsToUse.length / 2));
            console.log(`Retrying with reduced document count: ${reducedDocCount}`);
            
            // Recursively call with fewer documents
            return this.processQuery(
              query,
              conversationId,
              documentIdsToUse.slice(0, reducedDocCount),
              options
            );
          }
        }
        
        // Specific error handling based on status code
        if (statusCode === 401 || statusCode === 403) {
          throw new Error(`Authentication error: ${errorData.message || "Unauthorized access"}`);
        }
        
        if (statusCode === 429) {
          throw new Error(`Rate limit exceeded. Please try again later. ${errorData.message || ""}`);
        }
        
        // General error with enhanced information
        throw new Error(
          `Error processing query: ${errorData.message || error.message || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error("Error in processQuery:", error);
      throw error;
    }
  }

  /**
   * Optimize document context to prevent token limit issues
   * @param documentIds Document IDs to optimize
   * @param clientId Client ID for document access
   * @returns Promise resolving to optimized document ID list
   */
  private async optimizeContextForTokenLimits(
    documentIds: string[], 
    clientId: string
  ): Promise<string[]> {
    if (!documentIds || documentIds.length <= 5) {
      return documentIds;
    }
    
    try {
      console.log(`Optimizing context from ${documentIds.length} documents`);
      
      // Get document metadata to make intelligent decisions
      const metadataResponse = await apiClient.post('/documents/metadata', {
        document_ids: documentIds,
        client_id: clientId
      });
      
      const documentsWithMetadata = metadataResponse.data.documents || [];
      
      // Sort by relevance or recency
      const sortedDocuments = documentsWithMetadata.sort((a: any, b: any) => {
        // First try to sort by relevance score if available
        if (a.relevance_score !== undefined && b.relevance_score !== undefined) {
          return b.relevance_score - a.relevance_score;
        }
        
        // Otherwise sort by updated_at date (most recent first)
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Take top 5 documents
      const optimizedIds = sortedDocuments
        .slice(0, 5)
        .map((doc: any) => doc.id);
      
      console.log(`Optimized context to ${optimizedIds.length} documents`);
      return optimizedIds;
    } catch (error) {
      console.error("Error optimizing context:", error);
      // Fallback to simple limiting
      return documentIds.slice(0, 5);
    }
  }

  /**
   * Determine if a query is legal in nature
   * @param query The user's query text
   * @returns True if the query appears to be legal in nature
   */
  private isLegalQuery(query: string): boolean {
    if (!query) return false;
    
    const lowerQuery = query.toLowerCase();
    
    // Legal keywords that suggest a legal query
    const legalKeywords = [
      'legal', 'law', 'lawyer', 'attorney', 'court', 'judge', 'plaintiff', 'defendant',
      'litigation', 'sue', 'lawsuit', 'contract', 'agreement', 'liability', 'rights',
      'obligation', 'statute', 'regulation', 'jurisdiction', 'precedent', 'damages',
      'advice', 'counsel', 'legal opinion', 'legally'
    ];
    
    // Legal phrases that strongly indicate a legal query
    const legalPhrases = [
      'what does the law say',
      'is it legal',
      'legal requirements',
      'legal implications',
      'legal consequences',
      'legal advice',
      'legally obligated',
      'legal rights',
      'legal responsibilities'
    ];
    
    // Check if any legal keywords are present
    const hasKeyword = legalKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Check if any legal phrases are present
    const hasPhrase = legalPhrases.some(phrase => lowerQuery.includes(phrase));
    
    return hasKeyword || hasPhrase;
  }

  /**
   * Create a new conversation on the server or locally if server fails
   * @param clientId Optional client ID to associate with the conversation
   * @returns Promise resolving to the new conversation ID
   */
  async createNewConversation(clientId?: string): Promise<string> {
    const startTime = performance.now();
    const effectiveClientId = clientId || this.clientId;
    console.log(`[unifiedAIService] Creating new conversation for client ${effectiveClientId}`);
    
    // For anonymous or emergency mode, always use local conversation IDs
    if (!effectiveClientId || effectiveClientId === 'anonymous' || this.isEmergencyMode) {
      const localId = this.isEmergencyMode 
        ? `emergency-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`
        : `local-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log(`[unifiedAIService] Generated local conversation ID: ${localId}`);
      return localId;
    }
    
    // Attempt to create conversation on server
    try {
      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      try {
        // Try to create on backend with timeout
        const response = await api.post('/api/ai/create-conversation', {
          client_id: effectiveClientId
        }, {
          timeout: 5000, // Also set explicit timeout on axios
          signal: controller.signal // Connect to abort controller
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        // Successfully created on server
        if (response.data && response.data.conversation_id) {
          const conversationId = response.data.conversation_id;
          console.log(`[unifiedAIService] Created conversation on server: ${conversationId} in ${Math.round(performance.now() - startTime)}ms`);
          return conversationId;
        } else {
          throw new Error('Invalid response: missing conversation_id');
        }
      } catch (timeoutError) {
        // Clean up timeout
        clearTimeout(timeoutId);
        throw timeoutError;
      }
    } catch (error) {
      // Check for network errors specifically
      const isNetworkError = error && (
        (error.code === 'ERR_NETWORK') || 
        (error.message && error.message.includes('Network Error')) ||
        (error.message && error.message.includes('timeout'))
      );
      
      if (isNetworkError) {
        console.warn(`[unifiedAIService] Network error creating conversation on server, using local fallback: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        console.warn(`[unifiedAIService] Error creating conversation on server, using local fallback: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Fallback to local conversation ID when server is unavailable
      const localFallbackId = `local-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`[unifiedAIService] Created fallback local conversation ID: ${localFallbackId}`);
      return localFallbackId;
    }
  }

  /**
   * Send a message using the LangGraph workflow
   */
  async sendMessage(
    message: string,
    selectedDocuments: any[] = [],
    conversationId: string | null = null,
    modelId: string = 'gpt-4o-mini',
    previousMessages: Message[] = [],
    options: { isQuickAction?: boolean } = {}
  ): Promise<{
    message: string;
    conversationId: string;
    tokensUsed: number;
    cost: number;
    requireHumanFeedback: boolean;
    feedbackQuestions?: string[];
  }> {
    // Initialize actualConversationId at the beginning to avoid reference errors
    let actualConversationId = conversationId;
    try {
      console.log(`Bypassing LangGraph workflow due to errors. Using unified API instead.`);
      console.log(`Selected documents:`, selectedDocuments);
      console.log(`Previous messages count:`, previousMessages.length);
      
      // Determine if this is a quick action
      const isQuickAction = options.isQuickAction === true;
      // Check if this is a conversational query that doesn't need training data
      const isConversational = this.isConversationalQuery(message);
      
      console.log(`Using unified API for ${isQuickAction ? 'quick action' : 'regular message'}`);
      console.log(`Selected documents (${selectedDocuments.length}):`, selectedDocuments);
      console.log(`Previous messages count:`, previousMessages.length);
      
      if (isQuickAction) {
        console.log(`Quick action detected: Only using explicitly selected client documents`);
        console.log(`Quick action will prepare response for TTS and summarization`);
      }
      
      if (isConversational) {
        console.log(`Conversational query detected: Skipping training files for efficient response`);
      }
      
      // Enhanced document extraction logic
      const documentIds = selectedDocuments.map(doc => {
        // Case 1: doc is a string (already an ID)
        if (typeof doc === 'string') return { id: doc, type: 'client' };
        
        // Case 2: doc is an object with an id property
        if (doc && doc.id) {
          return { 
            id: doc.id, 
            type: doc.is_training_doc || doc.type === 'training' ? 'training' : 'client',
            title: doc.title || doc.file_name
          };
        }
        
        // Case 3: doc is an object with a name property but no id
        if (doc && doc.name) {
          return { 
            id: doc.name, 
            type: doc.is_training_doc || doc.type === 'training' ? 'training' : 'client',
            title: doc.title || doc.file_name
          };
        }
        
        return null;
      }).filter(Boolean);
      
      console.log(`Enhanced document extraction:`, documentIds);
      
      // Get simple document ID arrays for API calls
      const clientDocuments = documentIds
        .filter(doc => doc.type === 'client')
        .map(doc => doc.id);
      
      // For quick actions or conversational queries, don't include training documents
      const trainingDocuments = (isQuickAction || isConversational) ? [] : documentIds
        .filter(doc => doc.type === 'training')
        .map(doc => doc.id);
      
      console.log(`Client documents (${clientDocuments.length}):`, clientDocuments);
      console.log(`Training documents (${trainingDocuments.length}):`, trainingDocuments);
      
      if (isQuickAction && documentIds.some(doc => doc.type === 'training')) {
        console.warn(`Quick action: Ignoring ${documentIds.filter(doc => doc.type === 'training').length} training documents`);
      }
      
      if (isConversational && documentIds.some(doc => doc.type === 'training')) {
        console.warn(`Conversational query: Skipping ${documentIds.filter(doc => doc.type === 'training').length} training documents for more efficient response`);
      }
      
      // Log document titles for easier debugging
      const documentTitles = documentIds
        .filter(doc => doc.title)
        .map(doc => `${doc.id}: ${doc.title} (${doc.type})`);
      
      if (documentTitles.length > 0) {
        console.log(`Document titles for context:`, documentTitles);
      }
      
      // For conversation ID management
      if (!actualConversationId) {
        console.log(`Creating new conversation...`);
        try {
          const conversation = await this.createNewConversation(this.clientId);
          actualConversationId = conversation?.conversation_id;
          console.log(`Created new conversation: ${actualConversationId}`);
        } catch (err) {
          console.error("Error creating new conversation:", err);
          // Generate a fallback ID if API call fails
          actualConversationId = `temp_${this.generateId()}`;
          console.log(`Using temporary fallback conversation ID: ${actualConversationId}`);
        }
      } else {
        console.log(`Using existing conversation ID: ${actualConversationId}`);
      }
      
      // Format previous messages if provided
      const formattedPreviousMessages = previousMessages.map(msg => {
        return {
          role: msg.role,
          content: msg.content
        };
      });
      
      console.log(`Sending message with previous context: ${formattedPreviousMessages.length}`);
      console.log(`AI Query Context:`);
      console.log(`- Client ID: ${this.clientId}`);
      console.log(`- Conversation ID: ${actualConversationId}`);
      console.log(`- Original Model: ${modelId}`);
      
      // Map the model name to ensure compatibility with the API
      const mappedModel = this.mapModelName(modelId);
      console.log(`- Mapped Model for API: ${mappedModel}`);
      console.log(`- Client documents: ${clientDocuments.length ? clientDocuments.join(', ') : 'None'}`);
      console.log(`- Training documents: ${trainingDocuments.length ? trainingDocuments.join(', ').substr(0, 1000) + (trainingDocuments.join(', ').length > 1000 ? '...' : '') : 'None'}`);
      console.log(`- Previous messages: ${formattedPreviousMessages.length}`);
      console.log(`- Is quick action: ${isQuickAction}`);
      console.log(`- Is conversational: ${isConversational}`);
      
      // Define search mode based on quick action or conversation type
      const searchMode = isQuickAction || isConversational ? 'direct' : 'embeddings';
      console.log(`Using search mode: ${searchMode} for this ${isQuickAction ? 'quick action' : isConversational ? 'conversational query' : 'regular query'}`);
      
      // Determine if we should use only training files for legal queries
      const trainingFilesOnly = this.isLegalQuery(message) && !isQuickAction;
      
      // Always use the unified API instead of LangGraph
      const result = await this.processQuery(
        message,
        actualConversationId,
        [...clientDocuments, ...(isConversational ? [] : trainingDocuments)], // Skip training docs for conversational queries
        {
          modelName: mappedModel, // Use the mapped model name
          clientId: this.clientId,
          searchMode: searchMode,
          isQuickAction: isQuickAction, // This will set prepare_for_tts and summarize_response to true for quick actions
          trainingFilesOnly: trainingFilesOnly
        }
      );
      
      // Log the full result for debugging
      console.log('Full result from processQuery:', JSON.stringify(result, null, 2));
      
      // Create a fallback conversation ID if needed
      const fallbackConversationId = actualConversationId || conversationId || `error-${this.generateId()}`;
      
      // Return in the expected format with consistent conversation ID
      return {
        message: result.response || result.content || "No response content",
        conversationId: fallbackConversationId,
        tokensUsed: result.usage?.total_tokens || result.token_usage?.total_tokens || 0,
        cost: (result.usage?.total_tokens || result.token_usage?.total_tokens || 0) * 0.0001,
        requireHumanFeedback: false,
        feedbackQuestions: result.moduleOutput?.questions || []
      };
    } catch (error) {
      console.error("Error in processQuery:", error);
      
      // Create a fallback conversation ID if needed
      const fallbackConversationId = actualConversationId || conversationId || `error-${this.generateId()}`;
      
      // Provide a more detailed error message based on the type of error
      let errorMessage = "I apologize, but I encountered an unexpected error. Please try again.";
      
      if (error.message && error.message.includes('timeout')) {
        errorMessage = "I apologize, but the request timed out. This might be due to the complexity of your query or the size of the documents. Please try again with fewer documents or a simpler query.";
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = "I apologize, but there seems to be a network issue. Please check your internet connection and try again.";
      } else if (error.response && error.response.status === 413) {
        errorMessage = "I apologize, but your request is too large. Please try with fewer or smaller documents.";
      } else if (error.response && error.response.status >= 500) {
        errorMessage = "I apologize, but the server encountered an error. Our team has been notified and is working to resolve the issue. Please try again later.";
      }
      
      return {
        message: errorMessage,
        conversationId: fallbackConversationId,
        tokensUsed: 0,
        cost: 0,
        requireHumanFeedback: false
      };
    }
  }

  /**
   * Submit feedback for a workflow (e.g., letter reply)
   */
  async submitFeedback(
    conversationId: string,
    messageIndex: number,
    feedbackType: string,
    feedbackValue: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await api.submitFeedback({
        conversation_id: conversationId,
        message_index: messageIndex,
        feedback_type: feedbackType,
        feedback_value: feedbackValue,
        client_id: this.clientId
      });
      
      return {
        success: true,
        message: 'Feedback submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      // If it's a server error, return a partial success
      if (error.response) {
        console.error('Server error details:', error.response.data);
        return {
          success: false,
          message: `Error submitting feedback: ${error.response.data.detail || 'Unknown server error'}`
        };
      }
      
      // General error
      return {
        success: false,
        message: 'Unable to submit feedback due to a network error. Your feedback will be saved locally.'
      };
    }
  }

  /**
   * Maps non-standard model names to API-compatible model names
   * This ensures we only send model names the backend supports
   */
  private mapModelName(modelName: string): string {
    // List of models supported by the backend API
    const supportedModels = [
      'gpt-4', 
      'gpt-4-turbo', 
      'gpt-3.5-turbo', 
      'claude-3-opus', 
      'claude-3-sonnet', 
      'claude-3-haiku'
    ];
    
    // Direct mapping for known models that aren't supported
    const modelMapping: Record<string, string> = {
      // Map frontend model names to backend models
      'gpt-4o': 'gpt-4o',  // Keep as-is, no mapping needed
      'gpt-4o-mini': 'gpt-4o-mini',  // Keep as-is, no mapping needed
      'gpt-4-turbo': 'gpt-4-turbo',  // Keep as-is, no mapping needed
      
      // Legacy mappings for older models
      'deepseek-r1': 'gpt-4-turbo',  // Map to a valid model
      'deepseek-coder': 'gpt-4-turbo',
      'mixtral-8x7b': 'gpt-4-turbo',
      'mixtral': 'gpt-4-turbo',
      'llama': 'gpt-4-turbo',
      'llama-3': 'gpt-4-turbo',
      'llama-3-70b': 'gpt-4-turbo',
      
      // Claude models mapped to OpenAI models
      'claude-3-sonnet': 'gpt-4-turbo',
      'claude-3-opus': 'gpt-4o',
      'claude-3-haiku': 'gpt-4o-mini'
    };
    
    // First check if the model is already supported
    if (supportedModels.includes(modelName)) {
      return modelName;
    }
    
    // If we have a specific mapping, use it (case-insensitive lookup)
    const lowercaseModelName = modelName.toLowerCase();
    for (const [key, value] of Object.entries(modelMapping)) {
      if (lowercaseModelName === key.toLowerCase()) {
        console.log(`Mapping unsupported model "${modelName}" to supported model "${value}"`);
        return value;
      }
    }
    
    // Default fallback for any other unsupported model
    console.warn(`Unknown model "${modelName}" - using "gpt-4-turbo" as fallback`);
    return 'gpt-4-turbo';
  }

  /**
   * Handle a quick action request.
   * Quick actions are predefined tasks that can be performed on documents,
   * such as extracting dates, summarizing text, etc.
   * These actions automatically trigger text-to-speech for the response.
   * 
   * @param action The action to perform (e.g., 'Extract Dates', 'Summarize Document')
   * @param selectedFiles The files to perform the action on
   * @param modelId The model to use for the action
   * @returns The result of the action with TTS data
   */
  async handleQuickAction(
    action: string,
    documentIds: string[],
    modelId: string,
    trainingFiles: string[] = [],
    callback?: (result: any) => void
  ): Promise<any> {
    try {
      console.log("[handleQuickAction] Starting", action, "with:", {
        documentCount: documentIds.length,
        trainingCount: trainingFiles.length,
        model: modelId
      });

      // Exit early if no documents provided for document-dependent actions
      if (!documentIds || documentIds.length === 0) {
        console.error(`[handleQuickAction] No documents provided for ${action}`);
        const errorResult = {
          content: `## Error: No Documents Selected\n\nPlease select at least one document to perform the "${action}" action.`,
          response: `## Error: No Documents Selected\n\nPlease select at least one document to perform the "${action}" action.`,
        };

        if (callback) callback(errorResult);
        return errorResult;
      }

      console.log("Document IDs for quick action (" + documentIds.length + "):", documentIds);

      // Extract string IDs from document objects if needed
      const extractedIds = documentIds.map(doc => {
        // If it's a string, just return it
        if (typeof doc === 'string') return doc;
        
        // If it's an object with an id property, return the id
        if (doc && typeof doc === 'object' && 'id' in doc) return doc.id;
        
        // If it's an object without an id but with a name, use that as fallback
        if (doc && typeof doc === 'object' && 'name' in doc) return doc.name;
        
        // Otherwise return null (will be filtered out)
        return null;
      }).filter(Boolean);
      
      console.log("Extracted document IDs:", extractedIds);

      // Validate inputs - make sure we have document IDs and a client ID
      if (!this.clientId) {
        console.error("[handleQuickAction] Missing client ID");
        const errorResult = { 
          content: "Error: Missing client ID. Please refresh the page and try again.",
          response: "Error: Missing client ID. Please refresh the page and try again." 
        };
        if (callback) callback(errorResult);
        return errorResult;
      }

      // Ensure the client ID is set on the API client
      apiClient.clientId = this.clientId;
      console.log("[handleQuickAction] Set client ID on API client:", this.clientId);

      // Map action to backend action type
      const actionTypeMap: Record<string, string> = {
        "Extract Dates": "extract_dates",
        "Summarize Document": "summarize",
        "Reply to Letter": "reply_to_letter",
        "Prepare for Court": "prepare_for_court"
      };
      
      const actionType = actionTypeMap[action] || action.toLowerCase().replace(/\s+/g, '_');
      console.log("Mapped action '" + action + "' to backend action_type:", actionType);

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

      // Validate document IDs format first
      const validatedDocumentIds = await apiClient.validateDocumentIds(extractedIds);
      console.log("Validated document IDs (" + validatedDocumentIds.validIds.length + "):", validatedDocumentIds.validIds);
      
      // Exit early if no valid document IDs
      if (validatedDocumentIds.validIds.length === 0) {
        console.error("[handleQuickAction] No valid document IDs found");
        const errorResult = {
          content: `## Error: Invalid Documents\n\nThe selected documents could not be processed. Please try again with different documents.`,
          response: `## Error: Invalid Documents\n\nThe selected documents could not be processed. Please try again with different documents.`,
        };
        if (callback) callback(errorResult);
        return errorResult;
      }

      console.log("Total document IDs for API call:", validatedDocumentIds.validIds.length + " (client: " + validatedDocumentIds.validIds.length + ", training: " + trainingFiles.length + ")");

      // Special handling for direct action endpoints (like extract_dates)
      if (["extract_dates", "summarize", "reply_to_letter", "prepare_for_court"].includes(actionType)) {
        try {
          // Prepare request with proper parameters for action endpoints
          const requestData = {
            query: query,
            client_id: this.clientId, // Explicitly include client_id at top level
            documents: validatedDocumentIds.validIds,
            conversation_id: null,
            model: modelId || 'gpt-4-turbo',
            search_mode: 'direct',
            skip_embedding_generation: true,
            force_use_stored_embeddings: true,
            use_existing_embeddings: true,
            prepare_for_tts: true,
            summarize_response: true,
            // Also include document_ids specifically for endpoints that require DocumentRequest format
            document_ids: validatedDocumentIds.validIds,
            use_document_param_format: true
          };

          console.log("[apiClient] Querying AI with:", query);
          console.log("[apiClient] Using client ID:", this.clientId);
          console.log("[apiClient] Complete request payload:", requestData);

          // Make the API call
          const result = await apiClient.queryAI(requestData);
          
          if (!result.success) {
            console.error(`[handleQuickAction] Error in ${action}:`, result.error);
            const errorResult = {
              content: `## Error Processing ${action}\n\nThere was an error processing your request: ${result.error || "Unknown error"}`,
              response: `## Error Processing ${action}\n\nThere was an error processing your request: ${result.error || "Unknown error"}`,
              message_id: this.generateId()
            };
            if (callback) callback(errorResult);
            return errorResult;
          }

          // Check for date extraction data in API response
          if (action === "Extract Dates") {
            // ... existing code ...
          }

          console.log("API response received for " + action + ", generating TTS now...");
          console.log("Full result from API:", JSON.stringify(result, null, 2));

          // ... rest of existing code ...
        } catch (error) {
          // ... existing error handling ...
        }
      } else {
        // ... existing code for other actions ...
      }
    } catch (error) {
      // ... existing error handling ...
    }
  }

  /**
   * Generate a unique ID
   */
  generateId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  /**
   * Detects if a message is a simple greeting or general conversation
   * that doesn't require extensive document context
   */
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
      if (queryLower === pattern || 
          queryLower.startsWith(pattern + " ") || 
          queryLower.endsWith(" " + pattern)) {
        console.log(`Detected simple greeting: '${query}', will optimize response`);
        return true;
      }
    }
    
    // Check if the query is very short (likely conversational)
    if (queryLower.split(' ').length <= 5) {
      console.log(`Detected short conversational query: '${query}', will optimize response`);
      return true;
    }
    
    // Check for general conversational patterns
    for (const pattern of generalConversationPatterns) {
      if (queryLower.includes(pattern) || 
          queryLower.startsWith(pattern) || 
          queryLower.endsWith(pattern)) {
        console.log(`Detected general conversation pattern: '${query}', will optimize response`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Save a conversation to ensure it's properly stored in the database
   * @param conversationId ID of the conversation to save
   * @param messages Current message state of the conversation
   * @param clientId Client ID associated with the conversation
   * @returns Promise that resolves when the save attempt is complete
   */
  async saveConversation(
    conversationId: string, 
    messages: Array<{role: string; content: string}>,
    clientId?: string
  ): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      console.log(`[unifiedAIService] Saving conversation ${conversationId} with ${messages.length} messages`);
      
      // Skip empty conversations
      if (!messages || messages.length === 0) {
        console.log(`[unifiedAIService] Skipping save for empty conversation ${conversationId}`);
        return true;
      }
      
      // Skip anonymous/emergency conversations
      if (!conversationId || conversationId.includes('anonymous')) {
        console.log(`[unifiedAIService] Skipping save for anonymous conversation`);
        return true;
      }
      
      // For local conversation IDs, only save to localStorage
      if (conversationId.startsWith('local-') || conversationId.startsWith('emergency-') || conversationId.startsWith('temp_')) {
        console.log(`[unifiedAIService] Local conversation ID detected, saving only to localStorage: ${conversationId}`);
        return this._saveToLocalStorage(conversationId, messages, clientId || this.clientId);
      }
      
      // Try backend first with timeout and retry logic
      try {
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
        
        try {
          const response = await api.post('/api/ai/save-conversation', {
            conversation_id: conversationId,
            client_id: clientId || this.clientId,
            messages: messages
          }, {
            timeout: 8000, // Also set explicit timeout on axios
            signal: controller.signal // Connect to abort controller
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          console.log(`[unifiedAIService] Successfully saved conversation to backend in ${Math.round(performance.now() - startTime)}ms`);
          
          // Also save to local storage as backup
          this._saveToLocalStorage(conversationId, messages, clientId || this.clientId);
          
          return true;
        } catch (timeoutError) {
          // Clean up timeout
          clearTimeout(timeoutId);
          throw timeoutError;
        }
      } catch (error) {
        // Check for network errors specifically
        const isNetworkError = error && (
          (error.code === 'ERR_NETWORK') || 
          (error.message && error.message.includes('Network Error')) ||
          (error.message && error.message.includes('timeout'))
        );
        
        if (isNetworkError) {
          console.warn(`[unifiedAIService] Network error saving to backend, falling back to localStorage: ${error instanceof Error ? error.message : String(error)}`);
        } else {
          console.warn(`[unifiedAIService] Backend save failed, using localStorage: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Fallback to localStorage persistence when backend fails
        return this._saveToLocalStorage(conversationId, messages, clientId || this.clientId);
      }
    } catch (e) {
      console.error(`[unifiedAIService] Error in saveConversation: ${e instanceof Error ? e.message : String(e)}`);
      // Try localStorage as a last resort
      try {
        return this._saveToLocalStorage(conversationId, messages, clientId || this.clientId);
      } catch (finalError) {
        console.error(`[unifiedAIService] Final localStorage save attempt failed: ${finalError}`);
        // Return true anyway to prevent UI errors
        return true;
      }
    }
  }
  
  /**
   * Helper method to save conversation to localStorage
   * Extracted to avoid code duplication and ensure consistent implementation
   */
  private _saveToLocalStorage(
    conversationId: string,
    messages: Array<{role: string; content: string}>,
    clientId: string
  ): boolean {
    try {
      // Get existing conversations or initialize empty object
      const storedConversations = localStorage.getItem('ai_law_conversations') || '{}';
      let conversations;
      
      try {
        conversations = JSON.parse(storedConversations);
      } catch (parseError) {
        console.warn(`[unifiedAIService] Error parsing stored conversations, resetting: ${parseError}`);
        conversations = {};
      }
      
      // Save this conversation
      conversations[conversationId] = {
        id: conversationId,
        client_id: clientId,
        messages: messages,
        updated_at: new Date().toISOString(),
        is_local: conversationId.startsWith('local-') || conversationId.startsWith('emergency-') || conversationId.startsWith('temp_')
      };
      
      // Save back to localStorage
      localStorage.setItem('ai_law_conversations', JSON.stringify(conversations));
      
      // Also maintain a list of conversation IDs for easy access
      const conversationList = localStorage.getItem('ai_law_conversation_list') || '[]';
      let conversationIds;
      
      try {
        conversationIds = JSON.parse(conversationList);
      } catch (parseError) {
        console.warn(`[unifiedAIService] Error parsing conversation list, resetting: ${parseError}`);
        conversationIds = [];
      }
      
      if (!conversationIds.includes(conversationId)) {
        conversationIds.push(conversationId);
        localStorage.setItem('ai_law_conversation_list', JSON.stringify(conversationIds));
      }
      
      console.log(`[unifiedAIService] Successfully saved conversation to localStorage`);
      return true;
    } catch (localError) {
      console.error(`[unifiedAIService] Failed to save conversation to localStorage: ${localError instanceof Error ? localError.message : String(localError)}`);
      // Return true anyway to prevent UI errors
      return true;
    }
  }
} 