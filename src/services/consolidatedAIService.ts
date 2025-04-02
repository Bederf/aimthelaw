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
  useOpenManus?: boolean; // Option to enable OpenManus enhancement
  documentContext?: string; // Additional context about selected documents
  documentContents?: Record<string, string>; // Map of document IDs to their full content
  useEmbeddingsOnly?: boolean;
  chunkForTokens?: boolean;
  isProgressiveProcessing?: boolean;
}

// Document cache interface
interface DocumentCacheEntry {
  content: string;
  timestamp: number;
}

export class ConsolidatedAIService {
  private clientId: string;
  private apiUrl: string;
  
  private documentCache: Map<string, DocumentCacheEntry> = new Map();
  
  // Split into two separate Maps: one for abort controllers and one for debouncing
  private activeRequests: Map<string, AbortController> = new Map();
  private recentRequests: Map<string, number> = new Map(); // For debouncing, stores timestamps
  private isInQuickAction: boolean = false; // Assuming a flag like this exists

  constructor(clientId: string) {
    // Public pages may not have a client ID - use a default guest ID if empty
    if (!clientId || clientId === '') {
      console.log('No client ID provided, using default guest ID for public pages');
      this.clientId = '00000000-0000-0000-0000-000000000000'; // Default guest ID
      this.apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      console.log('ConsolidatedAIService initialized with default guest ID');
      console.log('API URL:', this.apiUrl);
      return;
    }
    
    // Validate client ID format for non-public pages
    if (!clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('Invalid client ID format provided to ConsolidatedAIService:', clientId);
      throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
    }
    
    this.clientId = clientId;
    this.apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    console.log('ConsolidatedAIService initialized with client ID:', clientId);
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
    if (!documentId) {
      console.warn('[getDocumentContent] Called with empty documentId');
      return '';
    }
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh && this.documentCache.has(documentId)) {
      const cachedEntry = this.documentCache.get(documentId)!;
      // Use cached content if it's less than 5 minutes old
      if (Date.now() - cachedEntry.timestamp < 5 * 60 * 1000) {
        console.log(`[getDocumentContent] Using cached content for document ${documentId}`);
        return cachedEntry.content;
      }
    }
    
    console.log(`[getDocumentContent] Fetching content for document ${documentId}`);
    
    try {
      const token = await this.getAccessToken();
      const fetchUrl = `${this.apiUrl}/api/client-documents/${documentId}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Specific handling for 404 (document not found) errors
        if (response.status === 404) {
          console.warn(`[getDocumentContent] Document ${documentId} not found (404)`);
          // Add a placeholder entry in the cache to prevent repeated requests for missing documents
          this.documentCache.set(documentId, {
            content: `[Document content unavailable - this document may have been deleted or is inaccessible]`,
            timestamp: Date.now()
          });
          return `[Document content unavailable - this document may have been deleted or is inaccessible]`;
        }
        
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.content || '';
      
      // Cache the content
      this.documentCache.set(documentId, {
        content,
        timestamp: Date.now()
      });
      
      // If cache gets too large, remove oldest entries
      if (this.documentCache.size > 50) {
        const oldestKey = this.findOldestCacheEntry();
        if (oldestKey) {
          this.documentCache.delete(oldestKey);
        }
      }
      
      return content;
    } catch (error) {
      console.error('[getDocumentContent] Error fetching document content:', error);
      
      // Add a fallback entry for this document ID to prevent repeated failing requests
      this.documentCache.set(documentId, {
        content: `[Error retrieving document content: ${error.message}]`,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  /**
   * Get content from a training document by its ID
   * @param trainingDocId The ID of the training document to fetch
   * @returns The document content as a string
   */
  private async getTrainingDocumentContent(trainingDocId: string): Promise<string> {
    try {
      // Get token for API authentication
      const token = await this.getAccessToken();
      
      // Try to fetch from API first (this approach is more direct)
      try {
        const response = await fetch(
          `${this.apiUrl}/api/training-files/${trainingDocId}/content`, 
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          return data.content || '';
        }
      } catch (e) {
        console.warn(`API fetch for training document ${trainingDocId} failed:`, e);
        // Continue with Supabase method
      }
      
      // Fetch the training document content from the legal_knowledge table
      const { data, error } = await supabase
        .from('legal_knowledge')
        .select('content')
        .eq('file_id', trainingDocId)
        .limit(1);
      
      if (error) {
        console.warn(`Supabase query error for training document ${trainingDocId}:`, error);
      }
      
      if (data && data.length > 0 && data[0].content) {
        return data[0].content;
      }
      
      // If not found in legal_knowledge, try to get it from training_files
      const fileResult = await supabase
        .from('training_files')
        .select('content, file_path')
        .eq('id', trainingDocId)
        .limit(1);
        
      if (fileResult.error) {
        console.warn(`Error fetching training file ${trainingDocId}:`, fileResult.error);
      }
      
      if (fileResult.data && fileResult.data.length > 0) {
        // If content is available directly in the record
        if (fileResult.data[0].content) {
          return fileResult.data[0].content;
        }
        
        // Otherwise try to get from storage
        const filePath = fileResult.data[0].file_path;
        if (filePath) {
          try {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('training-files')
              .download(filePath);
              
            if (fileError) {
              throw fileError;
            }
            
            if (fileData) {
              // Convert blob to text
              return await fileData.text();
            }
          } catch (storageError) {
            console.error(`Error downloading training file ${trainingDocId}:`, storageError);
          }
        }
      }
      
      // If we got here, we couldn't find content
      console.warn(`No content found for training document ${trainingDocId}`);
      return '';
    } catch (error) {
      console.error(`Error in getTrainingDocumentContent for ${trainingDocId}:`, error);
      return '';
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
  
  /**
   * Get conversations for a client
   * @param clientId Optional client ID to fetch conversations for. Defaults to the service's client ID.
   * @returns An array of conversation objects
   */
  async getConversations(clientId?: string): Promise<any[]> {
    try {
      // Use provided clientId or fallback to instance clientId
      const targetClientId = clientId || this.clientId;
      
      if (!targetClientId) {
        throw new Error("No client ID available for fetching conversations");
      }
      
      console.log(`Fetching conversations for client ${targetClientId}`);
      
      // Query the conversations from Supabase
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .eq('client_id', targetClientId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform the data to match expected format
      return data.map(conv => ({
        id: conv.id,
        summary: conv.title || 'Untitled conversation',
        date: conv.updated_at || conv.created_at,
        created_at: conv.created_at
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
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
   * Format dates into a markdown string
   * @param dates Array of date objects from the API
   * @returns Formatted markdown string
   */
  private formatDatesToMarkdown(dates: any[]): string {
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return "## Date Extraction\n\nNo dates were found in the selected documents.";
    }
    
    let markdown = `## Dates Extracted\n\nThe following dates were found in your documents:\n\n`;
    
    dates.forEach((dateInfo: any) => {
      if (!dateInfo) return;
      
      // Handle different date formats from the API
      let dateText, description, source, eventType;
      
      // Handle different possible formats
      if (typeof dateInfo === 'string') {
        // Simple string date
        dateText = dateInfo;
        description = '';
        source = '';
      } else if (dateInfo.date) {
        // Standard format with date field
        dateText = dateInfo.date;
        description = dateInfo.description || dateInfo.context || '';
        source = dateInfo.source || dateInfo.document_id || '';
        eventType = dateInfo.type || dateInfo.event_type || '';
      } else if (dateInfo.text) {
        // Format with text field
        dateText = dateInfo.text;
        description = dateInfo.description || dateInfo.context || '';
        source = dateInfo.source || dateInfo.document_id || '';
        eventType = dateInfo.type || dateInfo.event_type || '';
      } else if (dateInfo.event) {
        // Timeline format with event field
        dateText = dateInfo.date || dateInfo.timestamp || '';
        description = dateInfo.event || '';
        source = dateInfo.source || dateInfo.document_id || '';
        eventType = dateInfo.type || dateInfo.event_type || '';
      } else {
        // Unknown format - convert to string
        try {
          dateText = JSON.stringify(dateInfo);
        } catch (e) {
          dateText = 'Unknown date format';
        }
      }
      
      // Add formatted date to markdown
      markdown += `- **${dateText}**`;
      if (description) markdown += `: ${description}`;
      if (source) markdown += ` (${source})`;
      if (eventType && !description.includes(eventType)) markdown += ` [${eventType}]`;
      markdown += '\n';
    });
    
    return markdown;
  }

  /**
   * Send a message to the AI service with document context
   */
  async sendMessage(
    message: string,
    documentIds: string[],
    model: string = 'gpt-4o-mini',
    conversationId: string | null = null,
    previousMessages: Message[] = [],
    options: AIProcessingOptions = {}
  ) {
    // Track the request with a unique ID
    const requestId = this.generateRequestId();
    
    // Create abort controller for this request
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);
    
    // Initialize progress state
    let progressState: ProcessProgress = {
      state: ProcessState.INITIALIZING,
      progress: 0,
      detail: 'Initializing request'
    };
    
    // Validate the model - add support for Claude and Deepseek models
    const validModels = [
      'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
      'claude-3-7-sonnet', 'claude-3-haiku', 'claude-3-opus',
      'deepseek-coder', 'deepseek-llm'
    ];
    
    // If the model is not in the list of valid models, fall back to gpt-4o-mini
    if (!validModels.includes(model)) {
      console.warn(`Unknown model "${model}", falling back to "gpt-4o-mini"`);
      model = 'gpt-4o-mini';
    }
    
    // Helper function to update progress and call callback
    const updateProgress = (update: Partial<ProcessProgress>) => {
      progressState = {
        ...progressState,
        ...update
      };
      
      if (options.progressCallback) {
        options.progressCallback(progressState);
      }
    };

    try {
      updateProgress({
        state: ProcessState.INITIALIZING,
        progress: 5,
        detail: 'Preparing request'
      });
      
      // Ensure we have a valid client ID
      if (!this.clientId) {
        throw new Error('Missing client ID');
      }
      
      // Get access token for API requests
      const token = await this.getAccessToken();
      
      // Create or reuse conversation
      let currentConversationId = conversationId;
      
      if (!currentConversationId) {
        updateProgress({
          detail: 'Creating new conversation',
          progress: 10
        });
        
        // Create a new conversation
        currentConversationId = await this.createConversation();
        console.log(`Created new conversation with ID: ${currentConversationId}`);
      }
      
      // Should we use document content?
      const includeDocumentContent = options.includeDocumentContent !== false;
      
      // Prepare document contents if requested
      let documentContents: Record<string, string> = {};
      
      if (documentIds.length > 0 && includeDocumentContent) {
        updateProgress({
          state: ProcessState.FETCHING_DOCUMENTS,
          detail: `Fetching ${documentIds.length} document(s)`,
          progress: 15
        });
        
        // Fetch document contents
        for (let i = 0; i < documentIds.length; i++) {
          const docId = documentIds[i];
          try {
            documentContents[docId] = await this.getDocumentContent(docId);
            
            // Update progress based on document fetching
            const docProgress = 15 + (i / documentIds.length) * 20;
            updateProgress({
              progress: Math.round(docProgress),
              detail: `Fetched ${i + 1} of ${documentIds.length} document(s)`
            });
          } catch (err) {
            console.error(`Error fetching document ${docId}:`, err);
            // Continue with other documents even if one fails
          }
        }
      }
      
      // Prepare previous messages for context
      const formattedPreviousMessages = previousMessages.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }));
      
      // Apply conversational enhancement options if this is the first message
      if (previousMessages.length === 0 && !options.customSystemPrompt) {
        options.customSystemPrompt = 
          "You are a helpful and conversational AI legal assistant. Be friendly and personable in your responses. " +
          "Ask relevant follow-up questions to keep the conversation going. " +
          "If the user has selected documents, reference them specifically in your response. " +
          "If the user hasn't selected documents but should, gently suggest they select relevant documents from the sidebar.";
      }
      
      // Prepare request payload
      const requestPayload: AIQueryRequest = {
        query: message,
        client_id: this.clientId,
        documents: documentIds,
        model,
        conversation_id: currentConversationId,
        previous_messages: formattedPreviousMessages,
        system_prompt: options.customSystemPrompt,
        metadata: {
          force_document_analysis: options.forceDocumentAnalysis,
          skip_semantic_search: options.skipSemanticSearch,
          analyze_full_document: options.analyzeFullDocument,
          use_openmanus: options.useOpenManus !== false,
          document_context: options.documentContext || '',
          include_document_content: includeDocumentContent,
          document_contents: documentContents
        }
      };
      
      updateProgress({
        state: ProcessState.PROCESSING_QUERY,
        progress: 40,
        detail: 'Processing query with AI'
      });
      
      // Make API call
      const response = await fetch(`${this.apiUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      // Parse response
      const responseData = await response.json();
      
      updateProgress({
        state: ProcessState.COMPLETE,
        progress: 100,
        detail: 'Response complete'
      });
      
      // Clean up
      this.activeRequests.delete(requestId);
      
      return responseData;
    } catch (error) {
      // Handle error
      updateProgress({
        state: ProcessState.ERROR,
        detail: `Error: ${error.message}`,
        error: error.message
      });
      
      // Clean up
      this.activeRequests.delete(requestId);
      
      // Re-throw the error to be handled by caller
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
  public async handleQuickAction(
    action: string,
    documentIds: string[],
    model: string = 'gpt-4',
    options: AIProcessingOptions = {}
  ): Promise<any> {
    if (this.isInQuickAction) {
      console.warn(`[handleQuickAction] Already in a quick action, but trying to start ${action}`);
    }
    
    this.isInQuickAction = true;
    sessionStorage.setItem('QUICK_ACTION_IN_PROGRESS', 'true');
    
    console.log(`[handleQuickAction] Starting quick action: ${action}`);
    
    try {
      // Check if we have at least one document
      if (!documentIds || documentIds.length === 0) {
        throw new Error('No documents provided for quick action');
      }
      console.log(`[handleQuickAction] Processing ${documentIds.length} documents:`, documentIds);
      
      // Map our action names to backend identifiers
      const actionMapping: Record<string, string> = {
        'Extract Dates': 'extract_dates',
        'Summarize Document': 'summarize',
        'Prepare for Court': 'prepare_for_court',
        'Reply to Letter': 'reply_to_letter'
      };
      
      const backendAction = actionMapping[action] || action.toLowerCase().replace(/ /g, '_');
      console.log(`[handleQuickAction] Mapping action '${action}' to backend identifier '${backendAction}'`);
      
      // Special handling for court preparation with multiple documents
      // Check if this is a court preparation action with multiple documents
      // AND not already part of a progressive processing flow
      if ((backendAction === 'prepare_for_court' || 
           backendAction === 'extract_dates' || 
           backendAction === 'summarize') && 
          documentIds.length > 1 && 
          !options.isProgressiveProcessing) {
        console.log(`[handleQuickAction] Using progressive document processing for ${action} with ${documentIds.length} documents`);
        
        // Use specific handlers based on the action
        if (backendAction === 'prepare_for_court') {
          return this.handleProgressiveCourtPreparation(action, documentIds, model, options);
        } else if (backendAction === 'extract_dates') {
          return this.handleProgressiveDateExtraction(action, documentIds, model, options);
        } else if (backendAction === 'summarize') {
          return this.handleProgressiveSummarization(action, documentIds, model, options);
        }
      }
      
      // For actions that might exceed token limits, we'll use special handling
      const tokenIntensiveActions = ['prepare_for_court', 'summarize'];
      const isTokenIntensiveAction = tokenIntensiveActions.includes(backendAction);
      
      // For token-intensive actions, we might need embedding-only mode or chunking
      let useEmbeddingsOnly = false;
      let documentContents: Record<string, string> = {};
      
      // Check if we should use embeddings-only mode
      // 1. Explicitly set in options
      // 2. Previously had token limit issues and stored in session
      // 3. For more than 2 documents
      useEmbeddingsOnly = options.useEmbeddingsOnly === true || 
                         sessionStorage.getItem('USE_EMBEDDINGS_ONLY') === 'true' ||
                         documentIds.length > 2;
      
      // Fetch content for all documents if needed (and not using embeddings-only mode)
      if (isTokenIntensiveAction && !useEmbeddingsOnly) {
        console.log(`[handleQuickAction] Attempting to fetch full document contents for ${documentIds.length} documents`);
        // Always try to fetch document contents
        try {
          await Promise.all(documentIds.map(async (docId) => {
            try {
              const content = await this.getDocumentContent(docId);
              documentContents[docId] = content;
            } catch (e) {
              console.warn(`[handleQuickAction] Could not fetch content for document ${docId}:`, e);
              // If we get 404s, it's likely these documents are processed/embedded only
              if (e.message && e.message.includes('404')) {
                useEmbeddingsOnly = true;
              }
            }
          }));
          
          // If we couldn't fetch any document content, assume they're all embeddings-only
          if (documentIds.length > 0 && Object.keys(documentContents).length === 0) {
            console.log(`[handleQuickAction] No document content could be fetched, using embeddings-only mode`);
            useEmbeddingsOnly = true;
          }
        } catch (e) {
          console.error(`[handleQuickAction] Error fetching document contents:`, e);
          // Fall back to embeddings-only mode
          useEmbeddingsOnly = true;
        }
      } else if (useEmbeddingsOnly) {
        console.log(`[handleQuickAction] Using embeddings-only mode, skipping document content fetch`);
      }
      
      // Get access token
      const token = await this.getAccessToken();
      
      // Prepare the request body
      const requestBody: any = {
        action: backendAction,
        documents: documentIds,
        model: model,
        client_id: this.clientId,
        options: {
          ...options,
          useEmbeddingsOnly
        }
      };
      
      // Add mode information for clearer debugging
      if (useEmbeddingsOnly) {
        console.log(`[handleQuickAction] USING EMBEDDINGS-ONLY MODE: No raw document content will be sent`);
        requestBody.mode = "embeddings_only";
        
        // For "Prepare for Court" action, add additional context
        if (backendAction === 'prepare_for_court') {
          console.log(`[handleQuickAction] Court preparation will use vector embeddings instead of raw text`);
          requestBody.options.prioritizeEmbeddings = true;
        }
      } else if (Object.keys(documentContents).length > 0) {
        console.log(`[handleQuickAction] USING FULL-CONTENT MODE: Sending ${Object.keys(documentContents).length} documents content`);
        requestBody.mode = "full_content";
        requestBody.document_contents = documentContents;
      } else {
        console.log(`[handleQuickAction] USING HYBRID MODE: Relying on backend to fetch content as needed`);
        requestBody.mode = "hybrid";
      }
      
      // For token-intensive actions, estimate token count and handle accordingly
      if (isTokenIntensiveAction && Object.keys(documentContents).length > 0) {
        // Use our dedicated method for token estimation
        const estimatedTokens = this.estimateDocumentTokens(documentContents);
        
        console.log(`[handleQuickAction] Estimated tokens for documents: ${estimatedTokens}`);
        
        // Log individual document sizes for debugging
        Object.entries(documentContents).forEach(([docId, content]) => {
          const docChars = content.length;
          const docTokens = Math.ceil(docChars / 4);
          console.log(`[handleQuickAction] Document ${docId}: ~${docTokens} tokens (${docChars} chars)`);
        });
        
        // If we're close to the token limit, use chunking or embedding-only mode
        if (estimatedTokens > 3000) {
          if (backendAction === 'prepare_for_court') {
            // For court preparation, we need a comprehensive view, so use embeddings-only
            useEmbeddingsOnly = true;
            requestBody.options.useEmbeddingsOnly = true;
            console.log(`[handleQuickAction] Using embeddings-only mode for large documents (${estimatedTokens} tokens)`);
          } else if (backendAction === 'summarize') {
            // For summarization, we can use chunking
            requestBody.options.chunkForTokens = true;
            console.log(`[handleQuickAction] Enabling chunking for large documents`);
          }
        }
      }
      
      // For court preparation, add special optimizations based on document count and size
      if (backendAction === 'prepare_for_court') {
        // Use our token estimation method
        const documentTokens = this.estimateDocumentTokens(documentContents);
        const isSmallDocumentSet = documentIds.length <= 3 && documentTokens < 2000;
        
        // For known missing documents, don't even attempt to get contents
        // Instead, rely completely on embeddings for processed documents
        if (documentIds.length > 0 && Object.keys(documentContents).length === 0) {
          console.log(`[handleQuickAction] Documents appear to be processed already (embeddings only)`);
          
          // Force embeddings-only mode for processed documents
          useEmbeddingsOnly = true;
          requestBody.options.useEmbeddingsOnly = true;
          requestBody.options.skipContentFetch = true;
        }
        
        // For small document sets, optimize the prompt
        if (isSmallDocumentSet) {
          console.log(`[handleQuickAction] Using optimized compact mode for small court preparation (${documentIds.length} docs)`);
          
          // Add a special flag to use compact mode
          requestBody.options.useCompactMode = true;
          
          // Add specific instructions to use a more efficient prompt
          requestBody.options.customInstructions = 
            "USE COMPACT MODE: The user has a small number of documents. " +
            "Provide a concise court preparation without extensive examples. " +
            "Focus only on the most important legal points, key arguments, and critical dates. " +
            "Limit background explanations and be direct in your recommendations.";
          
          // Request a more concise model response format
          requestBody.options.responseFormat = "concise";
        }
      }
      
      console.log(`[handleQuickAction] Sending API request with body:`, requestBody);
      
      // Add token usage debugging for court preparation
      if (backendAction === 'prepare_for_court') {
        // Estimate tokens in the prompt/instructions
        const promptTemplate = `You are a legal assistant preparing for court. Analyze the following documents and provide a comprehensive strategy for court proceedings...`; // This is just an example
        const promptTokens = Math.ceil(promptTemplate.length / 4);
        const systemOverhead = 100; // Estimate for system overhead
        
        // Get document tokens using our estimation method
        const documentTokens = this.estimateDocumentTokens(documentContents);
        
        console.log(`[handleQuickAction] Court preparation token estimates:`);
        console.log(`- Prompt template: ~${promptTokens} tokens`);
        console.log(`- System overhead: ~${systemOverhead} tokens`);
        console.log(`- Document content: ~${documentTokens} tokens`);
        console.log(`- Total estimate: ~${promptTokens + systemOverhead + documentTokens} tokens`);
        console.log(`- Tokens remaining: ~${4096 - (promptTokens + systemOverhead + documentTokens)} tokens`);
      }
      
      // Make the API request
      const response = await fetch(`${this.apiUrl}/api/v2/ai/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        // Clear quick action flags and throw error
        sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
        this.isInQuickAction = false;
        
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[handleQuickAction] API Response for ${action}:`, result);
      
      // Process the result based on the action
      if (backendAction === 'extract_dates') {
        // Special handling for date extraction
        if (result.data?.dates) {
          return {
            dates: result.data.dates,
            content: this.formatDatesToMarkdown(result.data.dates),
            token_usage: result.data.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            cost: result.data.cost || 0
          };
        }
      } else if (backendAction === 'summarize') {
        // Special handling for document summarization
        if (result.data?.summary) {
          return {
            content: result.data.summary,
            token_usage: result.data.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            cost: result.data.cost || 0
          };
        }
      } else if (backendAction === 'prepare_for_court') {
        // Special handling for court preparation
        console.log(`[handleQuickAction] Examining court preparation response structure:`);
        console.log(`- Has .content: ${!!result.content}`);
        console.log(`- Has .formatted_response: ${!!result.formatted_response}`);
        console.log(`- Has .court_preparation: ${!!result.court_preparation}`);
        console.log(`- Has .response: ${!!result.response}`);
        console.log(`- Has .data: ${!!result.data}`);
        console.log(`- Response keys: ${Object.keys(result).join(', ')}`);
        
        if (result.data) {
          console.log(`- Data keys: ${Object.keys(result.data).join(', ')}`);
        }
        
        // Check for token limit error in strategy
        if (result.data?.preparation?.strategy && 
            typeof result.data.preparation.strategy === 'string' && 
            result.data.preparation.strategy.includes("Token limit exceeded")) {
            
          console.warn(`[handleQuickAction] Token limit error detected in court preparation: ${result.data.preparation.strategy}`);
          
          // Store this for future reference so we know to use embeddings-only next time
          sessionStorage.setItem('USE_EMBEDDINGS_ONLY', 'true');
          
          // If this is not part of progressive processing, try processing it progressively
          if (!options.isProgressiveProcessing && documentIds.length > 1) {
            console.log(`[handleQuickAction] Token limit reached with ${documentIds.length} documents, falling back to progressive processing`);
            return this.handleProgressiveCourtPreparation(action, documentIds, model, options);
          }
          
          // Return a user-friendly error message
          return {
            content: `## Court Preparation Error

**The court preparation could not be completed because the documents are too large.**

${result.data.preparation.strategy}

### How to fix this:
1. Try selecting fewer documents
2. Choose smaller documents
3. Or use a different action for these documents

You can still process these documents individually if needed.
`,
            token_usage: result.data.preparation.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            cost: result.data.preparation.cost || 0,
            sources: []
          };
        }
        
        // Try to extract content from different possible locations in the response
        let courtPreparationContent = '';
        
        if (result.data?.preparation?.strategy && typeof result.data.preparation.strategy === 'string') {
          courtPreparationContent = result.data.preparation.strategy;
        } else if (result.court_preparation) {
          courtPreparationContent = result.court_preparation;
        } else if (result.content) {
          courtPreparationContent = result.content;
        } else if (result.formatted_response) {
          courtPreparationContent = result.formatted_response;
        } else if (result.response) {
          courtPreparationContent = result.response;
        } else {
          console.warn(`[handleQuickAction] Could not find any content in the court preparation response`);
          courtPreparationContent = 'The court preparation was completed, but no detailed output was available.';
        }
        
        return {
          content: `## Court Preparation\n\n${courtPreparationContent}`,
          token_usage: result.data?.preparation?.token_usage || result.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: result.data?.preparation?.cost || result.cost || 0,
          sources: result.data?.preparation?.sources || result.sources || []
        };
      }
      
      // For other actions or if specific handling didn't return a result,
      // return a generic result structure
      return {
        ...result,
        content: result.content || result.formatted_response || result.response || 
                (result.data ? JSON.stringify(result.data, null, 2) : 'Operation completed successfully.'),
        token_usage: result.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: result.cost || 0,
        sources: result.sources || []
      };
    } catch (error) {
      console.error(`[handleQuickAction] Error in ${action}:`, error);
      throw error;
    } finally {
      console.log(`[handleQuickAction] Resetting isInQuickAction flag after ${action}.`);
      this.isInQuickAction = false;
    }
  }
  
  /**
   * Handle court preparation for multiple documents by processing them individually
   * and then combining the results
   */
  private async handleProgressiveCourtPreparation(
    action: string,
    documentIds: string[],
    model: string,
    options: AIProcessingOptions
  ): Promise<any> {
    console.log(`[handleProgressiveCourtPreparation] Processing ${documentIds.length} documents individually`);
    
    const individualResults: any[] = [];
    let totalTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let totalCost = 0;
    let allSources: any[] = [];
    
    // Process each document individually
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      console.log(`[handleProgressiveCourtPreparation] Processing document ${i+1}/${documentIds.length}: ${docId}`);
      
      try {
        // Process this single document with the same action
        const result = await this.handleQuickAction(
          action, 
          [docId], 
          model,
          { ...options, isProgressiveProcessing: true }
        );
        
        // Extract the content for this document
        let docContent = '';
        if (result.content) {
          // Remove the "## Court Preparation" header if present
          docContent = result.content.replace('## Court Preparation\n\n', '');
        }
        
        // Add document result
        individualResults.push({
          documentId: docId,
          content: docContent,
          token_usage: result.token_usage,
          cost: result.cost,
          sources: result.sources
        });
        
        // Accumulate token usage
        if (result.token_usage) {
          totalTokenUsage.prompt_tokens += result.token_usage.prompt_tokens || 0;
          totalTokenUsage.completion_tokens += result.token_usage.completion_tokens || 0;
          totalTokenUsage.total_tokens += result.token_usage.total_tokens || 0;
        }
        
        // Accumulate cost
        totalCost += result.cost || 0;
        
        // Accumulate sources
        if (result.sources && Array.isArray(result.sources)) {
          allSources = [...allSources, ...result.sources];
        }
      } catch (error) {
        console.error(`[handleProgressiveCourtPreparation] Error processing document ${docId}:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    // Now combine all the individual results
    if (individualResults.length === 0) {
      return {
        content: `## Court Preparation\n\nNo court preparation could be generated for any of the selected documents.`,
        token_usage: totalTokenUsage,
        cost: totalCost,
        sources: allSources
      };
    }
    
    // Combine the results with a title and summary
    const combinedContent = await this.combineCourtPreparationResults(individualResults, documentIds);
    
    return {
      content: combinedContent,
      token_usage: totalTokenUsage,
      cost: totalCost,
      sources: allSources,
      // Add metadata about progressive processing
      progressive_processing: {
        document_count: documentIds.length,
        processed_count: individualResults.length,
        progressive_mode: true
      }
    };
  }
  
  /**
   * Combine individual court preparation results into a cohesive document
   */
  private async combineCourtPreparationResults(
    individualResults: any[],
    documentIds: string[]
  ): Promise<string> {
    console.log(`[combineCourtPreparationResults] Combining ${individualResults.length} document analyses`);
    
    // Start with header
    let combinedContent = `## Court Preparation\n\n`;
    
    // Add summary section
    combinedContent += `### Summary\n\n`;
    combinedContent += `This court preparation analysis covers ${individualResults.length} documents. `;
    combinedContent += `Each document has been analyzed individually to avoid token limits, and the results have been combined for your convenience.\n\n`;
    
    // Add analysis for each document
    combinedContent += `### Document-by-Document Analysis\n\n`;
    
    for (let i = 0; i < individualResults.length; i++) {
      const result = individualResults[i];
      const docId = result.documentId;
      
      // Try to get a more user-friendly document name
      let docName = `Document ${i+1}`;
      try {
        // Look for a client file with this ID to get the file name
        const { data } = await supabase
          .from('client_files')
          .select('title, file_name')
          .eq('id', docId)
          .limit(1);
        
        if (data && data.length > 0) {
          docName = data[0].title || data[0].file_name || docName;
        }
      } catch (e) {
        console.warn(`[combineCourtPreparationResults] Error getting document name:`, e);
      }
      
      // Add document section
      combinedContent += `#### ${docName}\n\n`;
      combinedContent += `${result.content}\n\n`;
    }
    
    // Add global advice section
    combinedContent += `### Integration Advice\n\n`;
    combinedContent += `When preparing for court, consider how these documents relate to each other. `;
    combinedContent += `Look for common themes, contradictions, or supporting evidence across documents. `;
    combinedContent += `For a comprehensive integration of all documents, you may want to consult with your attorney to develop a unified strategy.\n\n`;
    
    return combinedContent;
  }

  /**
   * Handle date extraction for multiple documents by processing them individually
   * and then combining the results
   */
  private async handleProgressiveDateExtraction(
    action: string,
    documentIds: string[],
    model: string,
    options: AIProcessingOptions
  ): Promise<any> {
    console.log(`[handleProgressiveDateExtraction] Processing ${documentIds.length} documents individually`);
    
    const individualResults: any[] = [];
    let totalTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let totalCost = 0;
    let allDates: any[] = [];
    
    // Process each document individually
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      console.log(`[handleProgressiveDateExtraction] Processing document ${i+1}/${documentIds.length}: ${docId}`);
      
      try {
        // Process this single document with the same action
        const result = await this.handleQuickAction(
          action, 
          [docId], 
          model,
          { ...options, isProgressiveProcessing: true }
        );
        
        // Add document result
        individualResults.push({
          documentId: docId,
          content: result.content,
          dates: result.dates || [],
          token_usage: result.token_usage,
          cost: result.cost
        });
        
        // Collect all dates
        if (result.dates && Array.isArray(result.dates)) {
          // Add document identifier to each date
          const datesWithSource = result.dates.map((date: any) => {
            // If date is an object, add source property
            if (typeof date === 'object') {
              return {
                ...date,
                source: date.source || date.document_id || docId
              };
            }
            // If date is a string, create an object
            return {
              date: date,
              source: docId
            };
          });
          
          allDates = [...allDates, ...datesWithSource];
        }
        
        // Accumulate token usage
        if (result.token_usage) {
          totalTokenUsage.prompt_tokens += result.token_usage.prompt_tokens || 0;
          totalTokenUsage.completion_tokens += result.token_usage.completion_tokens || 0;
          totalTokenUsage.total_tokens += result.token_usage.total_tokens || 0;
        }
        
        // Accumulate cost
        totalCost += result.cost || 0;
      } catch (error) {
        console.error(`[handleProgressiveDateExtraction] Error processing document ${docId}:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    // Now combine all the individual results
    if (allDates.length === 0) {
      return {
        dates: [],
        content: `## Date Extraction\n\nNo dates were found in the selected documents.`,
        token_usage: totalTokenUsage,
        cost: totalCost
      };
    }
    
    // Format the combined dates
    const combinedContent = this.formatDatesToMarkdown(allDates);
    
    return {
      dates: allDates,
      content: combinedContent,
      token_usage: totalTokenUsage,
      cost: totalCost,
      // Add metadata about progressive processing
      progressive_processing: {
        document_count: documentIds.length,
        processed_count: individualResults.length,
        progressive_mode: true
      }
    };
  }

  /**
   * Handle document summarization for multiple documents by processing them individually
   * and then combining the results
   */
  private async handleProgressiveSummarization(
    action: string,
    documentIds: string[],
    model: string,
    options: AIProcessingOptions
  ): Promise<any> {
    console.log(`[handleProgressiveSummarization] Processing ${documentIds.length} documents individually`);
    
    const individualResults: any[] = [];
    let totalTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let totalCost = 0;
    
    // Process each document individually
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      console.log(`[handleProgressiveSummarization] Processing document ${i+1}/${documentIds.length}: ${docId}`);
      
      try {
        // Process this single document with the same action
        const result = await this.handleQuickAction(
          action, 
          [docId], 
          model,
          { ...options, isProgressiveProcessing: true }
        );
        
        // Extract the content for this document
        let docContent = '';
        if (result.content) {
          docContent = result.content;
        }
        
        // Add document result
        individualResults.push({
          documentId: docId,
          content: docContent,
          token_usage: result.token_usage,
          cost: result.cost
        });
        
        // Accumulate token usage
        if (result.token_usage) {
          totalTokenUsage.prompt_tokens += result.token_usage.prompt_tokens || 0;
          totalTokenUsage.completion_tokens += result.token_usage.completion_tokens || 0;
          totalTokenUsage.total_tokens += result.token_usage.total_tokens || 0;
        }
        
        // Accumulate cost
        totalCost += result.cost || 0;
      } catch (error) {
        console.error(`[handleProgressiveSummarization] Error processing document ${docId}:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    // Now combine all the individual results
    if (individualResults.length === 0) {
      return {
        content: `## Document Summaries\n\nNo summaries could be generated for the selected documents.`,
        token_usage: totalTokenUsage,
        cost: totalCost
      };
    }
    
    // Combine the results with a title and summary
    const combinedContent = await this.combineSummaryResults(individualResults, documentIds);
    
    return {
      content: combinedContent,
      token_usage: totalTokenUsage,
      cost: totalCost,
      // Add metadata about progressive processing
      progressive_processing: {
        document_count: documentIds.length,
        processed_count: individualResults.length,
        progressive_mode: true
      }
    };
  }

  /**
   * Combine individual summary results into a cohesive document
   */
  private async combineSummaryResults(
    individualResults: any[],
    documentIds: string[]
  ): Promise<string> {
    console.log(`[combineSummaryResults] Combining ${individualResults.length} document summaries`);
    
    // Start with header
    let combinedContent = `## Document Summaries\n\n`;
    
    // Add introduction
    combinedContent += `Summaries of ${individualResults.length} documents:\n\n`;
    
    // Add each document summary
    for (let i = 0; i < individualResults.length; i++) {
      const result = individualResults[i];
      const docId = result.documentId;
      
      // Try to get a more user-friendly document name
      let docName = `Document ${i+1}`;
      try {
        // Look for a client file with this ID to get the file name
        const { data } = await supabase
          .from('client_files')
          .select('title, file_name')
          .eq('id', docId)
          .limit(1);
        
        if (data && data.length > 0) {
          docName = data[0].title || data[0].file_name || docName;
        }
      } catch (e) {
        console.warn(`[combineSummaryResults] Error getting document name:`, e);
      }
      
      // Add document section
      combinedContent += `### ${docName}\n\n`;
      combinedContent += `${result.content}\n\n`;
    }
    
    return combinedContent;
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
    
    console.log(`Calling extractDates with ${validDocumentIds.length} valid document IDs:`, validDocumentIds);
    
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

  /**
   * Calculate the cost of API usage based on token usage
   * @param tokenUsage Object containing prompt_tokens and completion_tokens
   * @returns Calculated cost in dollars
   */
  calculateCost(tokenUsage: any): number {
    // If no token usage data, return 0
    if (!tokenUsage) {
      return 0;
    }
    
    // If a cost is already included, return it
    if (tokenUsage.cost) {
      return tokenUsage.cost;
    }
    
    // Define token rates for different models
    const rates: Record<string, {prompt: number, completion: number}> = {
      'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
      'gpt-4o': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
      'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
      'gpt-4o-mini': { prompt: 0.0035 / 1000, completion: 0.0035 / 1000 },
      'gpt-3.5-turbo': { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
      'default': { prompt: 0.01 / 1000, completion: 0.03 / 1000 } // Default to GPT-4 Turbo rates
    };
    
    // Get rates for the specific model, or use default if unknown
    const model = tokenUsage.model || 'default';
    const rate = rates[model] || rates['default'];
    
    // Extract token counts, defaulting to 0 if missing
    const promptTokens = tokenUsage.prompt_tokens || 0;
    const completionTokens = tokenUsage.completion_tokens || 0;
    
    // Calculate cost using the rates
    const promptCost = promptTokens * rate.prompt;
    const completionCost = completionTokens * rate.completion;
    const totalCost = promptCost + completionCost;
    
    // Return with 6 decimal precision
    return parseFloat(totalCost.toFixed(6));
  }

  // Helper to chunk document contents for token management
  private chunkDocumentContents(documents: Record<string, string>, maxTokensPerChunk: number = 3000): Record<string, string>[] {
    const chunks: Record<string, string>[] = [];
    let currentChunk: Record<string, string> = {};
    let currentTokenCount = 0;
    
    // Very rough token estimate (1 token ≈ 4 chars)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    Object.entries(documents).forEach(([docId, content]) => {
      const docTokens = estimateTokens(content);
      
      // If a single document is larger than the max, we need to split it
      if (docTokens > maxTokensPerChunk) {
        console.log(`[chunkDocumentContents] Document ${docId} is too large (est. ${docTokens} tokens), splitting`);
        
        // Split large documents into multiple chunks
        const docLines = content.split('\n');
        let chunkContent = '';
        let chunkTokens = 0;
        
        docLines.forEach((line) => {
          const lineTokens = estimateTokens(line);
          if (chunkTokens + lineTokens <= maxTokensPerChunk) {
            chunkContent += line + '\n';
            chunkTokens += lineTokens;
          } else {
            // This chunk is full, add it and start a new one
            if (chunkContent) {
              const chunkObj: Record<string, string> = {};
              chunkObj[docId] = chunkContent;
              chunks.push(chunkObj);
            }
            
            // Start new chunk with this line
            chunkContent = line + '\n';
            chunkTokens = lineTokens;
          }
        });
        
        // Add any remaining content
        if (chunkContent) {
          const chunkObj: Record<string, string> = {};
          chunkObj[docId] = chunkContent;
          chunks.push(chunkObj);
        }
      } 
      // If adding this document would exceed the limit, create a new chunk
      else if (currentTokenCount + docTokens > maxTokensPerChunk) {
        if (Object.keys(currentChunk).length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = { [docId]: content };
        currentTokenCount = docTokens;
      } 
      // Otherwise add to the current chunk
      else {
        currentChunk[docId] = content;
        currentTokenCount += docTokens;
      }
    });
    
    // Add the last chunk if not empty
    if (Object.keys(currentChunk).length > 0) {
      chunks.push(currentChunk);
    }
    
    console.log(`[chunkDocumentContents] Split documents into ${chunks.length} chunks for processing`);
    return chunks;
  }

  /**
   * Estimate the number of tokens in document contents
   * @param documents The document contents to estimate tokens for
   * @returns The estimated number of tokens
   */
  private estimateDocumentTokens(documents: Record<string, string>): number {
    // If no documents, return 0
    if (!documents || Object.keys(documents).length === 0) {
      return 0;
    }
    
    // Calculate total characters across all documents
    const totalChars = Object.values(documents).reduce((sum, content) => sum + content.length, 0);
    
    // Standard token estimation (4 chars ≈ 1 token)
    return Math.ceil(totalChars / 4);
  }
}

// Create singleton instance
export const consolidatedAIService = new ConsolidatedAIService(
  import.meta.env.VITE_DEFAULT_CLIENT_ID || ''
);

export default ConsolidatedAIService;
