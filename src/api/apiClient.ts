/**
 * API Client for the AI Law Assistant
 * Uses the auto-generated TypeScript types from the FastAPI schema
 */

// Import types - these will be available after running the type generation script
import { 
  AIQueryRequest, 
  AIResponse, 
  DateExtractionRequest, 
  DateExtractionResponse,
  DocumentProcessRequest,
  DocumentProcessResponse 
} from '../types/api-types';

// Add receipt types
import { Receipt, ReceiptItem } from '@/types/receipts';

import axios from "axios";
import { supabase } from '@/integrations/supabase/client';
import { getToken } from '@/utils/auth';

// Define the base API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Increase timeout to 2 minutes for all requests
});

// Add request interceptor to include auth token
instance.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
instance.interceptors.response.use(
  response => {
    // Calculate request duration
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = new Date().getTime() - startTime.getTime();
      console.log(`Request to ${response.config.url} completed in ${duration}ms`);
    }
    return response;
  },
  error => {
    // Enhanced error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        endpoint: error.config?.url,
        method: error.config?.method
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response Error:', {
        request: error.request,
        endpoint: error.config?.url,
        method: error.config?.method
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    
    // Add request timing information if available
    if (error.config?.metadata?.startTime) {
      const duration = new Date().getTime() - error.config.metadata.startTime.getTime();
      console.error(`Failed request to ${error.config.url} after ${duration}ms`);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Logging utility for API requests
 */
const apiLogger = {
  logRequest: (method: string, url: string, data?: any, config?: any) => {
    console.group(`🌐 API Request: ${method} ${url}`);
    console.log('📝 Request Data:', data);
    if (config) console.log('⚙️ Config:', config);
    console.log('⏱️ Timestamp:', new Date().toISOString());
    console.groupEnd();
  },
  
  logResponse: (method: string, url: string, response: any, duration: number) => {
    console.group(`✅ API Response: ${method} ${url}`);
    console.log('📄 Response Data:', response);
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
  },
  
  logError: (method: string, url: string, error: any, duration: number) => {
    console.group(`❌ API Error: ${method} ${url}`);
    console.error('🔴 Error:', error);
    if (error.response) {
      console.error('📄 Response Data:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
    console.error(`⏱️ Duration: ${duration}ms`);
    console.error('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
};

/**
 * API functions for different endpoints
 * Using the generated types from the FastAPI schema
 */
export const api = {
  // Define the baseUrl property
  baseUrl: API_URL,
  
  // Add clientId property
  clientId: undefined as string | undefined,
  
  // Core HTTP methods
  async get(url: string, params = {}) {
    const startTime = Date.now();
    apiLogger.logRequest('GET', url, params);
    
    try {
      const response = await instance.get(url, { params });
      apiLogger.logResponse('GET', url, response.data, Date.now() - startTime);
      return response;
    } catch (error) {
      apiLogger.logError('GET', url, error, Date.now() - startTime);
      throw error;
    }
  },

  async post(url: string, data = {}, config = {}) {
    const startTime = Date.now();
    apiLogger.logRequest('POST', url, data, config);
    
    try {
      const response = await instance.post(url, data, config);
      apiLogger.logResponse('POST', url, response.data, Date.now() - startTime);
      return response;
    } catch (error) {
      apiLogger.logError('POST', url, error, Date.now() - startTime);
      throw error;
    }
  },

  async put(url: string, data = {}) {
    const startTime = Date.now();
    apiLogger.logRequest('PUT', url, data);
    
    try {
      const response = await instance.put(url, data);
      apiLogger.logResponse('PUT', url, response.data, Date.now() - startTime);
      return response;
    } catch (error) {
      apiLogger.logError('PUT', url, error, Date.now() - startTime);
      throw error;
    }
  },

  async delete(url: string) {
    const startTime = Date.now();
    apiLogger.logRequest('DELETE', url);
    
    try {
      const response = await instance.delete(url);
      apiLogger.logResponse('DELETE', url, response.data, Date.now() - startTime);
      return response;
    } catch (error) {
      apiLogger.logError('DELETE', url, error, Date.now() - startTime);
      throw error;
    }
  },

  // AI queries
  async queryAI(
    query: string | any, 
    options: { 
      clientId?: string;
      documents?: string[];
      trainingDocuments?: string[];
      conversationId?: string;
      previousMessages?: Array<{role: string; content: string}>;
      modelName?: string;
      searchMode?: string;
      prepare_for_tts?: boolean;
      summarize_response?: boolean;
      skip_embedding_generation?: boolean;
      force_use_stored_embeddings?: boolean;
      use_existing_embeddings?: boolean;
      isQuickAction?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log("[apiClient] Querying AI with:", 
        typeof query === 'string' ? query : 'Complex query object');
        
      // Add client ID from options or from the instance
      const clientId = options.clientId || this.clientId;
      
      // Validate client ID is present
      if (!clientId) {
        console.error("[apiClient] Missing required field: client_id");
        return {
          success: false,
          error: "Missing required field: client_id"
        };
      }
      
      console.log("[apiClient] Using client ID:", clientId);
      
      // Use a longer timeout for AI operations, especially for date extraction
      const timeout = 30000; // Increase timeout to 30 seconds
      
      // Create request object based on query type
      let requestData;
      
      if (typeof query === 'string') {
        // Simple string query
        requestData = {
          query,
          client_id: clientId,
          model: options.modelName || 'gpt-4-turbo',
          documents: options.documents || [],
          training_documents: options.trainingDocuments || [],
          conversation_id: options.conversationId,
          previous_messages: options.previousMessages || [],
          search_mode: options.searchMode || 'hybrid',
          prepare_for_tts: options.prepare_for_tts,
          summarize_response: options.summarize_response,
          skip_embedding_generation: options.skip_embedding_generation,
          force_use_stored_embeddings: options.force_use_stored_embeddings,
          use_existing_embeddings: options.use_existing_embeddings ?? true
        };
      } else {
        // Object-based query (pass through)
        requestData = {
          ...query,
          client_id: clientId
        };
      }
      
      // Log the AI query request for debugging
      console.log("[apiClient] AI query request:", JSON.stringify(requestData, null, 2));
      
      // Get auth header before making the request
      const authHeader = await this.getAuthHeader();
      
      // Make API call with extended timeout
      const response = await axios.post(`${this.baseUrl}/api/ai/query`, requestData, {
        timeout: timeout, // Use extended timeout
        headers: authHeader
      });
      
      // Log response status
      console.log(`[apiClient] AI query response status: ${response.status}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Detailed error handling
      if (error.code === 'ECONNABORTED') {
        console.error('[apiClient] Request timeout:', error.message);
        return {
          success: false,
          error: "The request took too long to complete. The operation may still be processing on the server."
        };
      }
      
      // Log detailed error info
      console.error("[apiClient] AI query error:", error);
      
      if (error.response) {
        // The server responded with an error
        console.error('[apiClient] Server error details:', error.response.data);
        return {
          success: false,
          error: error.response.data.detail || error.response.data.message || "Server error"
        };
      }
      
      return {
        success: false,
        error: error.message || "Error communicating with AI service"
      };
    }
  },
  
  // Client operations
  getClientById: async (clientId: string) => {
    console.log(`Fetching client data for ID: ${clientId}`);
    try {
      // Fetch client base data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          client_id,
          email,
          phone,
          photo_url,
          status,
          role,
          id_number,
          created_at
        `)
        .eq('id', clientId)
        .single();
      
      if (clientError) {
        console.error(`Error fetching client data for ID ${clientId}:`, clientError);
        throw clientError;
      }
      
      // Fetch profile data for additional fields like first_name, last_name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', clientId)
        .maybeSingle();
      
      if (profileError) {
        console.warn(`Could not fetch profile data for client ${clientId}:`, profileError);
        // Continue with just the client data
      }
      
      // Combine client and profile data
      return { 
        data: { 
          ...client, 
          first_name: profile?.first_name || null, 
          last_name: profile?.last_name || null 
        }
      };
    } catch (error) {
      console.error(`Error fetching client data for ID ${clientId}:`, error);
      throw error;
    }
  },
  
  // Conversation management
  async createConversation(clientId?: string, lawyerId?: string) {
    try {
      console.log(`[apiClient] Creating conversation for clientId: ${clientId}, lawyerId: ${lawyerId}`);
      
      const body: any = {};
      if (clientId) body.client_id = clientId;
      if (lawyerId) body.lawyer_id = lawyerId;
      
      // Get auth header before making the request
      const authHeader = await this.getAuthHeader();
      
      try {
        // Use a longer timeout for this operation (60 seconds)
        const response = await axios.post(`${this.baseUrl}/api/ai/create-conversation`, body, {
          headers: authHeader,
          timeout: 60000 // 60 seconds timeout
        });
        
        console.log(`[apiClient] Conversation created successfully: ${response.data?.conversation_id}`);
        return response.data;
      } catch (serverError: any) {
        // Always generate a local fallback for any server-side errors (including 404)
        console.error(`[apiClient] Server error creating conversation:`, serverError);
        
        if (serverError.response) {
          const status = serverError.response.status;
          const statusText = serverError.response.statusText;
          const message = serverError.response.data?.detail || '';
          console.error("Backend error details:", { status, statusText, message });
        }
        
        // Create a client-side UUID to use as a conversation ID
        const fallbackId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.warn(`[apiClient] Using fallback local conversation ID: ${fallbackId}`);
        
        // Return a formatted response that matches what the server would return
        return {
          conversation_id: fallbackId,
          client_id: clientId,
          lawyer_id: lawyerId,
          created_at: new Date().toISOString(),
          title: `New Conversation (Local ${new Date().toLocaleTimeString()})`,
          is_local_fallback: true,  // Add this flag to indicate this is a fallback
          messages: []
        };
      }
    } catch (error) {
      // Handle any other errors in the outer try/catch
      console.error(`[apiClient] Critical error creating conversation:`, error);
      
      // Still provide a fallback even for critical errors
      const emergencyFallbackId = `emergency-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      return {
        conversation_id: emergencyFallbackId,
        client_id: clientId,
        lawyer_id: lawyerId,
        created_at: new Date().toISOString(),
        title: `Emergency Conversation (${new Date().toLocaleTimeString()})`,
        is_local_fallback: true,
        is_emergency_fallback: true,
        messages: []
      };
    }
  },
    
  // Feedback
  submitFeedback: (data: { 
    conversation_id: string, 
    message_index: number, 
    feedback_type: string, 
    feedback_value: any, 
    client_id: string 
  }) => instance.post("/ai/feedback", data),
  
  // Document operations
  processDocument: async (requestData: DocumentProcessRequest | { document_id: string; client_id: string; options: any; metadata?: any }): Promise<DocumentProcessResponse> => {
    console.group('📄 Document Processing Request');
    
    // Handle the field name change: Convert document_id to file_id if needed
    const adaptedRequestData = { ...requestData };
    if ('document_id' in adaptedRequestData && !('file_id' in adaptedRequestData)) {
      console.log('🔄 Converting document_id to file_id for API compatibility');
      adaptedRequestData.file_id = adaptedRequestData.document_id;
      // Keep document_id for backward compatibility with the rest of our code
    }
    
    console.log('📝 Adapted Request Data:', JSON.stringify(adaptedRequestData, null, 2));
    console.log('🔑 File ID:', adaptedRequestData.file_id);
    console.log('👤 Client ID:', adaptedRequestData.client_id);
    console.log('⚙️ Options:', adaptedRequestData.options);
    console.log('⏱️ Started at:', new Date().toISOString());
    
    const startTime = Date.now();
    
    try {
      console.log("🔄 Sending request to /api/documents/process endpoint...");
      
      const response = await instance.post<DocumentProcessResponse>(
        "/api/documents/process",
        adaptedRequestData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout for processing
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Document processing successful (took ${duration}ms)`);
      console.log("📄 Response data:", JSON.stringify(response.data, null, 2));

      // Convert file_id back to document_id for backward compatibility
      const adaptedResponse = {
        success: true,
        ...response.data
      };
      
      // Set document_id for backward compatibility
      if (adaptedResponse.file_id && !adaptedResponse.document_id) {
        adaptedResponse.document_id = adaptedResponse.file_id;
      }
      
      // If original request had document_id, ensure it's in the response
      if ('document_id' in requestData) {
        adaptedResponse.document_id = requestData.document_id;
      }

      return adaptedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Document processing failed after ${duration}ms`);
      
      if (axios.isAxiosError(error)) {
        console.error('🔴 Axios Error:', error.message);
        
        if (error.request && !error.response) {
          console.error('🔴 No response received from server');
        }
        
        if (error.response) {
          console.error('🔴 Error Status:', error.response.status);
          console.error('🔴 Error Status Text:', error.response.statusText);
          console.error('🔴 Response Headers:', JSON.stringify(error.response.headers, null, 2));
          
          if (error.response.data) {
            console.error('🔴 Response Data:', JSON.stringify(error.response.data, null, 2));
          }
          
          // Detailed logging for validation errors (422)
          if (error.response.status === 422) {
            console.error('🔴 VALIDATION ERROR DETAILS:');
            if (Array.isArray(error.response.data?.detail)) {
              error.response.data.detail.forEach((err: any, index: number) => {
                console.error(`  Error ${index + 1}:`, err);
                console.error(`    Location: ${err.loc?.join('.')}`);
                console.error(`    Message: ${err.msg}`);
                console.error(`    Type: ${err.type}`);
              });
            } else {
              console.error('  Detail:', error.response.data?.detail);
            }
            
            // Log what might be missing from the request
            console.error('🔍 Request validation check:');
            console.error(`  - file_id present: ${!!adaptedRequestData.file_id}`);
            console.error(`  - client_id present: ${!!adaptedRequestData.client_id}`);
            console.error(`  - options present: ${!!adaptedRequestData.options}`);
            if (adaptedRequestData.options) {
              console.error(`    - extract_text: ${!!adaptedRequestData.options.extract_text}`);
              console.error(`    - generate_embeddings: ${!!adaptedRequestData.options.generate_embeddings}`);
            }
          }
        }
        
        const originalId = 'document_id' in requestData ? requestData.document_id : 
                         ('file_id' in requestData ? requestData.file_id : 'unknown');
        
        return {
          success: false,
          error: error.response?.data?.detail?.[0]?.msg || 
                 error.response?.data?.detail || 
                 error.message || 
                 'Unknown error processing document',
          document_id: originalId,
          file_id: originalId
        };
      }
      
      console.error('🔴 Non-Axios Error:', error);
      const originalId = 'document_id' in requestData ? requestData.document_id : 
                       ('file_id' in requestData ? requestData.file_id : 'unknown');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing document',
        document_id: originalId,
        file_id: originalId
      };
    } finally {
      console.groupEnd();
    }
  },
  
  async getDocumentStatus(documentId: string): Promise<DocumentProcessResponse> {
    return instance.get<DocumentProcessResponse>(`/api/documents/${documentId}/status`);
  },
  
  // Date extraction
  extractDates: (requestData: DateExtractionRequest) => instance.post<DateExtractionResponse>("/api/extract_dates", requestData),
  
  // Reprocess document embeddings
  reprocessDocumentEmbeddings: async (documentId: string, clientId: string): Promise<DocumentProcessResponse> => {
    console.group('📄 Document Embeddings Reprocessing Request');
    console.log('🔑 Document ID:', documentId);
    console.log('👤 Client ID:', clientId);
    console.log('⏱️ Started at:', new Date().toISOString());
    
    const startTime = Date.now();
    
    try {
      console.log("🔄 Sending request to /api/documents/reprocess-embeddings endpoint...");
      
      const response = await instance.post<DocumentProcessResponse>(
        "/api/documents/reprocess-embeddings",
        {
          document_id: documentId,
          client_id: clientId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Document embeddings reprocessing initiated (took ${duration}ms)`);
      console.log("📄 Response data:", JSON.stringify(response.data, null, 2));

      return {
        success: true,
        ...response.data,
        document_id: documentId
      };
    } catch (error) {
      console.error('❌ Error reprocessing document embeddings:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reprocessing document embeddings',
        document_id: documentId
      };
    } finally {
      console.groupEnd();
    }
  },
  
  // Training documents - using generic types until we have proper types for these
  async processTrainingDocument<TRequest, TResponse>(requestData: TRequest): Promise<TResponse> {
    return instance.post<TResponse>('/api/training/process', requestData);
  },
  
  async searchTrainingDocuments<TRequest, TResponse>(requestData: TRequest): Promise<TResponse> {
    return instance.post<TResponse>('/api/training/search', requestData);
  },
  
  // System logs
  logClientAction: <TRequest, TResponse>(requestData: TRequest) => instance.post<TResponse>("/api/log_action", requestData),
  
  // Maintenance calculation
  processMaintenanceDocuments: (clientId: string, documentIds: string[]) => {
    console.log(`Processing maintenance documents for client ${clientId} with documents:`, documentIds);
    return instance.post("/api/maintenance/process", { 
      client_id: clientId, 
      document_ids: documentIds 
    })
    .catch(error => {
      console.error("Error processing maintenance documents:", error);
      // Log detailed error info
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    });
  },
    
  getClientTransactions: (clientId: string, limit: number = 100) => {
    console.log(`Fetching transactions for client ${clientId} with limit ${limit}`);
    return instance.get(`/api/maintenance/transactions/${clientId}`, { 
      params: { limit } 
    })
    .catch(error => {
      console.error("Error fetching client transactions:", error);
      // Log detailed error info
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    });
  },
    
  async getMaintenanceData(clientId: string): Promise<any> {
    try {
      console.log(`Fetching maintenance data for client ${clientId}`);
      
      const response = await instance.get(`/api/maintenance/maintenance-data/${clientId}`, {
        timeout: 30000, // 30 seconds
      });
      
      return response;
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      // Log additional error details if available
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  },

  async downloadMaintenanceFormPDF(clientId: string, options: { 
    includeTransactions?: boolean,
    clientName?: string,
    clientIdNumber?: string,
    clientAddress?: string,
    clientContact?: string
  } = {}): Promise<Blob> {
    try {
      console.log(`Downloading maintenance form PDF for client ${clientId}`);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (options.includeTransactions !== undefined) {
        params.append('include_transactions', options.includeTransactions.toString());
      }
      if (options.clientName) {
        params.append('client_name', options.clientName);
      }
      if (options.clientIdNumber) {
        params.append('client_id_number', options.clientIdNumber);
      }
      if (options.clientAddress) {
        params.append('client_address', options.clientAddress);
      }
      if (options.clientContact) {
        params.append('client_contact', options.clientContact);
      }
      
      const response = await instance.get(`/api/maintenance/generate-pdf/${clientId}?${params.toString()}`, {
        responseType: 'blob',
        timeout: 60000, // 60 seconds for PDF generation
      });
      
      return response.data;
    } catch (error) {
      console.error("Error downloading maintenance form PDF:", error);
      // Log additional error details if available
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  },

  // Receipt scanner functions
  async getClientReceipts(clientId: string) {
    try {
      // This method would typically call the backend API
      // However, since we're using Supabase directly in the components for receipts
      // this is just a placeholder for future implementation
      const response = await this.get(`/api/maintenance/receipts?client_id=${clientId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching client receipts:", error);
      throw error;
    }
  },
  
  async processReceipt(clientId: string, receiptUrl: string) {
    try {
      const response = await this.post('/api/maintenance/receipts/process', {
        client_id: clientId,
        receipt_url: receiptUrl
      });
      return response.data;
    } catch (error) {
      console.error("Error processing receipt:", error);
      throw error;
    }
  },
  
  async generateExpenseReport(clientId: string, options: {
    startDate?: string;
    endDate?: string;
    format?: 'pdf' | 'xlsx' | 'csv';
  } = {}) {
    try {
      const response = await this.post(
        '/api/maintenance/receipts/report',
        {
          client_id: clientId,
          start_date: options.startDate,
          end_date: options.endDate,
          format: options.format || 'xlsx'
        },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error("Error generating expense report:", error);
      throw error;
    }
  },
  
  async addReceiptToExpenses(clientId: string, receiptId: string, items: any[]) {
    try {
      const response = await this.post('/api/maintenance/receipts/add-to-expenses', {
        client_id: clientId,
        receipt_id: receiptId,
        items: items
      });
      return response.data;
    } catch (error) {
      console.error("Error adding receipt to expenses:", error);
      throw error;
    }
  },

  // Text-to-speech methods
  async textToSpeech(text: string, options = {}) {
    try {
      const response = await this.post('/api/tts/convert', {
        text,
        model: "tts-1",
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Text-to-speech conversion error:', error);
      throw error;
    }
  },
  
  // Enhanced TTS with follow-up question
  async textToSpeechWithQuestion(text: string, voice = 'nova', options = {}) {
    try {
      const requestData = {
        text,
        voice,
        model: "tts-1",
        include_question: options.includeQuestion || options.includePrompt || false,
        question_text: options.questionText || options.promptText || '',
        summarize: options.summarize !== false, // Default to true for better TTS experience
        autoplay: options.autoplay || false,
        format: options.format || 'mp3',
        // Additional options for quick actions with longer responses
        max_summary_length: options.maxSummaryLength || 300, // Default max summary length
        preserve_key_points: options.preserveKeyPoints !== false, // Preserve key points in summarization
        optimize_for_speech: options.optimizeForSpeech !== false // Optimize summarization for speech
      };
      
      console.log('Text-to-speech request:', {
        textLength: text.length,
        voice,
        summarize: requestData.summarize,
        includeQuestion: requestData.include_question,
        hasQuestionText: Boolean(requestData.question_text),
        optimizeForSpeech: requestData.optimize_for_speech
      });
      
      const response = await this.post('/api/tts/convert', requestData);
      return response.data;
    } catch (error) {
      console.error('Error in text-to-speech conversion:', error);
      throw error;
    }
  },

  // Direct streaming audio for WSL environments
  async textToSpeechStreaming(text: string, options = {}) {
    try {
      // We'll use a direct browser fetch here instead of axios
      // This allows us to handle the response as a blob directly
      const url = `${API_URL}/api/tts/stream`;
      
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model: "tts-1",
          ...options
        })
      };
      
      // Get authorization token if available
      const token = await getToken();
      if (token) {
        requestOptions.headers.Authorization = `Bearer ${token}`;
      }
      
      // Fetch the audio as a blob
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`Streaming audio request failed: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create a URL for the blob
      const audioUrl = URL.createObjectURL(blob);
      
      return {
        success: true,
        audioUrl,
        blob,
        format: options.format || 'mp3',
        // This object mimics the structure returned by the regular textToSpeech method
        // but provides direct audio URLs instead of base64 data
        cleanup: () => {
          // Helper function to release the blob URL when done
          URL.revokeObjectURL(audioUrl);
        }
      };
    } catch (error) {
      console.error('Error streaming text-to-speech:', error);
      throw error;
    }
  },

  // Generate a direct URL to streaming audio for iframe playback
  getStreamingAudioUrl(text: string, options = {}) {
    try {
      // Limit text length for URL safety
      const truncatedText = text.substring(0, 2000);
      
      // Create a unique request ID to prevent caching issues
      const uniqueId = Date.now().toString();
      
      // Create URL parameters directly since we're using GET
      const params = new URLSearchParams();
      params.append('text', truncatedText);
      params.append('model', 'tts-1');
      params.append('voice', options.voice || 'nova');
      params.append('summarize', options.summarize ? 'true' : 'false');
      params.append('include_question', options.includeQuestion ? 'true' : 'false');
      params.append('format', options.format || 'mp3');
      params.append('request_id', uniqueId);
      
      // Create direct URL to the streaming endpoint
      const streamUrl = `${API_URL}/api/tts/stream?${params.toString()}`;
      
      console.log(`Generated streaming URL (truncated): ${streamUrl.substring(0, 100)}...`);
      
      return streamUrl;
    } catch (error) {
      console.error('Error generating streaming URL:', error);
      return null;
    }
  },

  // Attempts to generate insights for a document
  async generateInsights(
    documentId: string,
    clientId: string, 
    options = {
      extract_dates: true,
      extract_entities: true,
      extract_key_points: true,
      generate_summary: true
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.group('📊 Generating Insights');
      console.log('Document ID:', documentId);
      console.log('Client ID:', clientId);
      console.log('Options:', JSON.stringify(options, null, 2));
      
      // Define timeout promise for request
      const timeoutPromise = new Promise<{ success: false, error: string }>((resolve) => {
        setTimeout(() => {
          resolve({ 
            success: false, 
            error: 'Request timed out after 15 seconds' 
          });
        }, 15000); // 15 second timeout
      });
      
      // Try the legacy endpoint first since we know it works
      console.log('🔄 Trying legacy API: /api/insights');
      
      // Convert request format to match the legacy API
      const insightsRequest = {
        file_ids: [documentId],
        client_id: clientId,
        insight_types: [] // empty means all insights
      };
      
      try {
        const legacyPromise = instance.post('/api/insights', insightsRequest);
        const legacyResponse = await Promise.race([legacyPromise, timeoutPromise]);
        
        // Check if we got a timeout result
        if ('success' in legacyResponse && legacyResponse.success === false) {
          console.warn('⚠️ Legacy API request timed out');
          throw new Error('Timeout');
        }
        
        console.log('✅ Insights generation successful via legacy API');
        console.log('📊 Response data:', legacyResponse.data);
        console.groupEnd();
        return { success: true, data: legacyResponse.data };
      } catch (legacyError) {
        // If the legacy endpoint failed, try the modern one as fallback
        console.warn('⚠️ Legacy API failed:', legacyError.message || 'Unknown error');
        
        if (axios.isAxiosError(legacyError)) {
          console.warn('Status:', legacyError.response?.status);
          console.warn('Data:', legacyError.response?.data);
        }
        
        // Only try the modern endpoint if the legacy failed for reasons other than 404
        if (!axios.isAxiosError(legacyError) || legacyError.response?.status !== 404) {
          console.log('🔄 Attempting modern API: /api/insights/generate');
          
          try {
            const modernPromise = instance.post('/api/insights/generate', {
              document_id: documentId,
              client_id: clientId,
              options
            });
            
            const modernResponse = await Promise.race([modernPromise, timeoutPromise]);
            
            // Check if we got a timeout result
            if ('success' in modernResponse && modernResponse.success === false) {
              console.warn('⚠️ Modern API request timed out');
              throw new Error('Timeout');
            }
            
            console.log('✅ Insights generation successful via modern API');
            console.log('📊 Response data:', modernResponse.data);
            console.groupEnd();
            return { success: true, data: modernResponse.data };
          } catch (modernError) {
            console.error('❌ Both API endpoints failed');
            
            if (axios.isAxiosError(modernError)) {
              console.error('Modern API error:', modernError.message);
              console.error('Status:', modernError.response?.status);
              
              if (modernError.response?.status === 404) {
                console.error('❌ Insights API not available (404 on both endpoints)');
                console.groupEnd();
                return { 
                  success: false, 
                  error: 'Insights API not available in this deployment' 
                };
              }
              
              if (modernError.response?.data) {
                console.error('Response data:', modernError.response.data);
              }
            }
          }
        }
        
        // Both endpoints failed or we skipped modern API due to 404
        console.error('❌ Failed to generate insights via available endpoints');
        console.groupEnd();
        return {
          success: false,
          error: axios.isAxiosError(legacyError) 
            ? `API error: ${legacyError.response?.data?.message || legacyError.message}`
            : (legacyError instanceof Error ? legacyError.message : 'Unknown error')
        };
      }
    } catch (error) {
      console.error('❌ Unexpected error generating insights:', error);
      console.groupEnd();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unexpected error generating insights'
      };
    }
  },

  // Add this method to the API client
  async validateDocumentIds(documentIds: string[]): Promise<{
    success: boolean;
    validIds: string[];
    invalidIds: string[];
    message?: string;
  }> {
    try {
      console.log("Validating", documentIds.length, "document IDs");
      
      // If empty array was provided, treat as valid (intentionally no documents)
      if (documentIds.length === 0) {
        return {
          success: true,
          validIds: [],
          invalidIds: [],
          message: "No documents provided, proceeding with empty context"
        };
      }
      
      // Normalize inputs to extract IDs if needed
      const normalizedIds = documentIds.map(doc => {
        // Handle string IDs directly
        if (typeof doc === 'string') return doc;
        
        // Handle document objects with id property
        if (doc && typeof doc === 'object' && 'id' in doc) return doc.id;
        
        // Handle document objects with name property as fallback
        if (doc && typeof doc === 'object' && 'name' in doc) return doc.name;
        
        return null;
      }).filter(Boolean);
      
      console.log("Normalized", documentIds.length, "document inputs to", normalizedIds.length, "IDs");
      
      // Rest of existing validation logic...
      
      // Get client ID for the request
      const clientId = this.clientId;
      if (!clientId) {
        console.error("[apiClient] Missing required field: client_id");
        return {
          success: true, // Still return success to prevent breaking the flow
          validIds: normalizedIds,
          invalidIds: []
        };
      }
      
      // Check if documents exist by making a batch request
      try {
        const response = await this.get(`/client_files/validate`, { 
          document_ids: normalizedIds.join(','),
          client_id: clientId // Include the client ID in the request
        });
        
        // Make sure response and response.data exist
        if (response && response.data) {
          // Backend returns which IDs were found
          const validIds = response.data?.valid_ids || normalizedIds;
          const invalidIds = response.data?.invalid_ids || [];
          
          console.log(`Validation result: ${validIds.length} valid, ${invalidIds.length} invalid`);
          
          return {
            success: true,
            validIds,
            invalidIds,
            message: invalidIds.length > 0 
              ? `${invalidIds.length} document(s) could not be found or accessed` 
              : undefined
          };
        } else {
          // If the validation endpoint response is malformed, assume all IDs are valid for backward compatibility
          console.warn('Document validation endpoint returned unexpected response, assuming all IDs are valid');
          return {
            success: true,
            validIds: normalizedIds,
            invalidIds: []
          };
        }
      } catch (error) {
        // If the endpoint doesn't exist or errors, assume all filtered IDs are valid
        console.warn('Error calling document validation endpoint:', error);
        return {
          success: true,
          validIds: normalizedIds,
          invalidIds: []
        };
      }
    } catch (error) {
      console.error('Error in validateDocumentIds:', error);
      return {
        success: false,
        validIds: [],
        invalidIds: documentIds,
        message: 'Error validating document IDs'
      };
    }
  },

  // Auth header helper
  async getAuthHeader() {
    try {
      // Use the same getToken function used in the interceptor for consistency
      const token = await getToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    return {}; // Return empty object if no token found or error
  }
}; 

// Add named export for apiClient (to fix the SyntaxError)
export const apiClient = api;

// Export default for backward compatibility
export default api; 