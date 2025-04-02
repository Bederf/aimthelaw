/**
 * Modern AI Service using the typed API client
 * This service provides the same interface as the existing AIService
 * but uses the typed API client internally for better type safety
 */

import { Message } from '@/types/ai';
import { loggingService } from './loggingService';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { AIQueryRequest, AIResponse, DateExtractionResponse } from '@/types/api-types';
import { MessageSender, MessageRole } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

export interface AIProcessingOptions {
  forceDocumentAnalysis?: boolean;
  skipSemanticSearch?: boolean;
  analyzeFullDocument?: boolean;
}

export class ModernAIService {
  private clientId: string;
  private apiUrl: string;

  constructor(clientId: string) {
    // Validate client ID format
    if (!clientId || !clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('Invalid client ID format provided to ModernAIService:', clientId);
      throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
    }
    
    this.clientId = clientId;
    this.apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    console.log('ModernAIService initialized with client ID:', clientId);
    console.log('API URL:', this.apiUrl);
  }

  // Get the current access token from supabase
  async getAccessToken(): Promise<string> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        throw new Error('Not authenticated');
      }
      
      return data.session.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Track analytics events
  private async trackAnalytics(eventData: any, clientId: string): Promise<void> {
    // Temporarily disabled analytics
    return;
  }

  // Convert the modern response format to match the old service
  private transformAIResponse(response: AIResponse): any {
    // Check if we have a strategy field (for court case preparation)
    if ('strategy' in response && response.strategy) {
      return {
        message: response.strategy,
        strategy: response.strategy,
        response: response.response || response.strategy,
        token_usage: response.token_usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        cost: response.cost || 0,
        sources: response.sources || response.citations || []
      };
    }
    
    // Standard response format
    return {
      message: response.response,
      token_usage: response.token_usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      cost: response.cost || 0, 
      sources: response.citations || []
    };
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

  async sendMessage(
    message: string,
    documentIds: string[],
    model: string = 'gpt-4',
    conversationId: string | null = null,
    previousMessages: Message[] = [],
    options: {
      customSystemPrompt?: string;
      includeDocumentContent?: boolean;
    } = {}
  ) {
    console.log('ModernAIService.sendMessage called with:', { 
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
      await this.saveMessage(conversationId, userMessage);
      console.log('Saved user message to conversation:', conversationId);

      // Ensure client ID is in the correct format (UUID)
      if (!this.clientId || !this.clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.error('Invalid client ID format:', this.clientId);
        throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
      }

      // Get authorization token
      const token = await this.getAccessToken();
      console.log('Got auth token:', token ? 'Valid token' : 'No token');
      
      // Log the request for debugging
      console.log('Sending AI query request:', {
        query: message,
        client_id: this.clientId,
        documents: documentIds,
        model: model,
        conversation_id: conversationId
      });

      // Use the correct endpoint URL
      const apiEndpoint = `${this.apiUrl}/api/query/`;
      console.log('API endpoint:', apiEndpoint);

      // Fetch training info from Supabase and prepare a training text
      const trainingInfo = await this.getTrainingInfo();
      let trainingText = '';
      if (trainingInfo.length > 0) {
        // Optionally limit the length of trainingText if needed
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

      // Make API request
      console.log('Making fetch request to API endpoint');
      const response = await fetch(apiEndpoint, {
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
          conversation_history: formattedPreviousMessages
        }),
      });

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
          sources: result.sources
        }
      };
      
      await this.saveMessage(conversationId, aiMessage);
      console.log('Saved AI message to conversation');

      // Return the result
      return {
        message: aiMessage,
        conversation_id: conversationId,
        token_usage: result.token_usage,
        cost: result.cost,
        sources: result.sources
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  // For compatibility with the enhanced version
  async sendMessageWithContext(
    message: string,
    documentIds: string[],
    model: string = 'gpt-4',
    conversationId: string | null = null,
    previousMessages: Message[] = [],
    options: AIProcessingOptions = {}
  ) {
    // Use the basic sendMessage for now
    return this.sendMessage(message, documentIds, model, conversationId, previousMessages);
  }

  // Analyze document by calling the AI service
  async analyzeDocument(selectedFiles: string[], model: string = 'gpt-4') {
    try {
      // Log the document analysis request
      await this.trackAnalytics({
        event: 'document_analysis',
        files: selectedFiles
      }, this.clientId);

      // Get authorization token
      const token = await this.getAccessToken();
      
      // Prepare request data - no insights needed for document analysis
      const requestData = {
        query: "Perform a comprehensive legal analysis of the document",
        client_id: this.clientId,
        documents: selectedFiles,
        use_rag: true,
        model: model,
        system_prompt: "You are a legal document analyzer. Provide a detailed analysis of the document, including key points, obligations, risks, and important dates."
      };

      // Make the API call
      const response = await fetch(`${this.apiUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to analyze document');
      }

      const data = await response.json();
      return this.transformAIResponse(data);
    } catch (error) {
      console.error("Document analysis error:", error);
      throw error;
    }
  }

  // Add extractDates method for compatibility with AIService
  async extractDates(documentIds: string[], model: string = 'gpt-4'): Promise<DateExtractionResponse> {
    try {
      console.log('Starting date extraction for documents:', documentIds);
      console.log('Client ID:', this.clientId);
        
        // Get authorization token
        const token = await this.getAccessToken();
        
      // Make API request with all document IDs
        const response = await fetch(`${this.apiUrl}/api/extract_dates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                client_id: this.clientId,
          documents: documentIds,  // Send all document IDs
                model: model,
          use_rag: false,
          skip_training_data: true
            })
        });
        
        if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', error);
        throw new Error(error.detail || 'Failed to extract dates');
        }
        
        const data = await response.json();
      console.log('Date extraction successful, found dates:', data.dates?.length || 0);
      return data;
    } catch (error) {
        console.error('Error in extractDates:', error);
      throw error;
    }
  }

  // Update generateLegalSummary method to use fetch instead of api client
  async generateLegalSummary(selectedFiles: string[], model: string = 'gpt-4') {
    try {
      await loggingService.info('AI', 'generate_legal_summary', 'Starting legal summary generation', {
        model,
        files: selectedFiles
      }, this.clientId);

      // Get authorization token
      const token = await this.getAccessToken();
      
      // Get document content first
      console.log('Fetching content for documents:', selectedFiles);
      let allContent = '';

      // Process and get content for each document
      for (const fileId of selectedFiles) {
        // First check document status
        const statusResponse = await fetch(`${this.apiUrl}/api/documents/${fileId}/status?client_id=${this.clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!statusResponse.ok) {
          const error = await statusResponse.json();
          throw new Error(error.detail || 'Failed to check document status');
        }

        const statusData = await statusResponse.json();
        console.log('Document status:', statusData);

        // If document is not processed, process it
        if (statusData.status !== 'processed' && statusData.status !== 'partial') {
          console.log('Document not processed, initiating processing...');
          const processResponse = await fetch(`${this.apiUrl}/api/documents/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              file_id: fileId,
              client_id: this.clientId,
              preserve_embeddings: false,
              force_reprocess: true
            })
          });
          
          if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.detail || 'Failed to process document');
          }

          // Wait for processing to complete by polling status
          let processingComplete = false;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!processingComplete && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
            
            const checkResponse = await fetch(`${this.apiUrl}/api/documents/${fileId}/status?client_id=${this.clientId}`, {
              method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
              }
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.status === 'processed' || checkData.status === 'partial') {
                processingComplete = true;
                console.log('Document processing completed');
              } else if (checkData.status === 'failed') {
                throw new Error('Document processing failed');
              }
            }
            
            attempts++;
          }
          
          if (!processingComplete) {
            throw new Error('Document processing timed out');
          }
        }

        // Now try to get document content
        const contentResponse = await fetch(`${this.apiUrl}/api/documents/${fileId}/content?client_id=${this.clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!contentResponse.ok) {
          const error = await contentResponse.json();
          throw new Error(error.detail || 'Failed to fetch document content');
        }

        const contentData = await contentResponse.json();
        if (!contentData.content) {
          throw new Error('Document content is empty');
        }
        
        allContent += (allContent ? '\n\n' : '') + contentData.content;
      }

      if (!allContent) {
        throw new Error('No content available from any of the selected documents');
      }

      // Make API request with the document content
      const response = await fetch(`${this.apiUrl}/api/legal_summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: this.clientId,
          content: allContent,
          documents: selectedFiles,
          model: model
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate legal summary');
      }

      const data = await response.json();
      
      // Enhanced logging for structured data
      console.log('Legal summary API response:', {
        responseKeys: Object.keys(data),
        hasResponse: 'response' in data,
        hasSummary: 'summary' in data,
        hasContent: 'content' in data,
        hasStructuredSummary: 'structured_summary' in data,
        hasSections: 'sections' in data,
        responsePreview: data.response ? data.response.substring(0, 100) + '...' : 'undefined',
        summaryPreview: data.summary ? data.summary.substring(0, 100) + '...' : 'undefined',
        contentPreview: data.content ? data.content.substring(0, 100) + '...' : 'undefined'
      });
      
      // Log structured summary if available
      if (data.structured_summary) {
        console.log('Structured summary keys:', Object.keys(data.structured_summary));
        
        // Log overview section
        if (data.structured_summary.overview) {
          console.log('Overview section:', data.structured_summary.overview);
        }
        
        // Log key points
        if (data.structured_summary.key_points) {
          console.log('Key points count:', data.structured_summary.key_points.length);
          console.log('First key point sample:', data.structured_summary.key_points[0]);
        }
        
        // Log legal analysis
        if (data.structured_summary.legal_analysis) {
          console.log('Legal analysis keys:', Object.keys(data.structured_summary.legal_analysis));
        }
      }

      // Log token usage if present
      if (data.token_usage) {
        await loggingService.logTokenUsage(
          this.clientId, 
          'generate_legal_summary', 
          data.token_usage,
          data.cost || 0
        );
      }

      await loggingService.info('AI', 'generate_legal_summary_complete', 'Legal summary generation completed', {
        token_usage: data.token_usage
      }, this.clientId);

      // Return in the expected format with properly structured data
      return {
        summary: data.response || data.summary || data.content || "No summary content was returned from the API",
        structured_summary: data.structured_summary || {},
        token_usage: data.token_usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        cost: data.cost || 0,
        sections: data.sections || data.structured_summary || {},
        sources: data.citations || data.sources || []
      };
    } catch (error) {
      await loggingService.error('AI', 'generate_legal_summary', 'Error in generateLegalSummary', error, null, this.clientId);
      throw error;
    }
  }

  // Add prepareCourt method
  async prepareCourt(selectedFiles: string[], model: string = 'gpt-4o-mini', useMultiAgent: boolean = true) {
    try {
      console.log('Starting court preparation with files:', selectedFiles, 'model:', model, 'useMultiAgent:', useMultiAgent);
      
      // Log the court preparation request
      await this.trackAnalytics({
        event: 'court_preparation',
        files: selectedFiles,
        model: model,
        multi_agent: useMultiAgent
      }, this.clientId);

      // Get authorization token
      const token = await this.getAccessToken();
      console.log('Got authorization token for court preparation');
      
      // Get document content directly as a fallback
      const documentContents: Record<string, string> = {};
      
      for (const fileId of selectedFiles) {
        try {
          console.log(`Fetching content for document ${fileId}`);
          const contentResponse = await fetch(`${this.apiUrl}/api/documents/${fileId}/content?client_id=${this.clientId}`, {
            method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
            }
          });
          
          if (contentResponse.ok) {
            const data = await contentResponse.json();
            documentContents[fileId] = data.content;
            console.log(`Retrieved content for document ${fileId}: ${data.content.length} chars`);
            } else {
            console.warn(`Could not retrieve content for document ${fileId}: ${contentResponse.status} ${contentResponse.statusText}`);
          }
        } catch (contentError) {
          console.warn(`Error fetching content for document ${fileId}:`, contentError);
        }
      }

      // Make the API request with selected model and multi-agent flag
      const response = await fetch(`${this.apiUrl}/api/court-case/prepare`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
        body: JSON.stringify({
          client_id: this.clientId,
          documents: selectedFiles,
          model: model,
          use_tot: useMultiAgent  // Add flag for multi-agent Tree-of-Thought
        })
      });

      if (!response.ok) {
        throw new Error(`Error preparing court case: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Court preparation result:', result);
      
      // Check if we have a valid strategy
      if (result.strategy && typeof result.strategy === 'string' && result.strategy.trim().length > 0) {
        console.log('Valid strategy found in court preparation result');
        return this.transformAIResponse({
          response: result.strategy,
          strategy: result.strategy,
          token_usage: result.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: result.cost || 0,
          sources: result.sources || [],
          failed_documents: result.failed_documents || []
        });
      }
      
      // Ensure we have a valid strategy or response
      const strategy = result.strategy || '';
      
      return this.transformAIResponse({
        response: strategy || result.response || '',
        strategy: strategy || result.response || '',
        token_usage: result.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: result.cost || 0,
        sources: result.sources || [],
        failed_documents: result.failed_documents || []
      });
    } catch (error) {
      console.error('Error in prepareCourt:', error);
      throw error;
    }
  }

  /**
   * Start an interactive letter reply workflow with human feedback
   * 
   * @param documentId The ID of the letter document to analyze
   * @param model The AI model to use
   * @returns Workflow ID and initial status
   */
  async startLetterReplyWorkflow(documentId: string, model: string = 'gpt-4o-mini'): Promise<any> {
    try {
      console.log('Starting letter reply workflow for document:', documentId, 'model:', model);
      
      // Log the workflow start for analytics
      await this.trackAnalytics({
        event: 'letter_reply_workflow_start',
        document_id: documentId,
        model: model
      }, this.clientId);

      // Get authorization token
      const token = await this.getAccessToken();
      
      // Start the workflow by calling the backend API
      const response = await fetch(`${this.apiUrl}/api/letters/workflow/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: this.clientId,
          document_id: documentId,
          model: model
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error starting letter reply workflow: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Letter reply workflow started:', result);
      
      return {
        workflowId: result.workflow_id,
        status: result.status,
        message: result.message
      };
    } catch (error) {
      console.error('Error in startLetterReplyWorkflow:', error);
      throw error;
    }
  }

  async getLetterReplyWorkflowStatus(workflowId: string): Promise<any> {
    try {
      // Get authorization token
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.apiUrl}/api/letters/reply/workflow/${workflowId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get workflow status: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      await loggingService.error('AI', 'get_letter_workflow_status', 'Error in getLetterReplyWorkflowStatus', error, null, this.clientId);
      throw error;
    }
  }

  async submitLetterReplyFeedback(workflowId: string, answers: string[]): Promise<any> {
    try {
      // Log the feedback submission
      await this.trackAnalytics({
        event: 'letter_reply_feedback',
        workflow_id: workflowId
      }, this.clientId);

      // Get authorization token
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.apiUrl}/api/letters/reply/workflow/${workflowId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answers
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit feedback: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      await loggingService.error('AI', 'submit_letter_reply_feedback', 'Error in submitLetterReplyFeedback', error, null, this.clientId);
      throw error;
    }
  }

  /**
   * Handle quick actions like document analysis, date extraction, etc.
   * Quick actions are predefined tasks that can be performed on documents,
   * such as extracting dates, summarizing text, etc.
   * These actions automatically trigger text-to-speech for the response.
   * 
   * @param action The action to perform (e.g., 'Extract Dates', 'Summarize Document')
   * @param documentIds The files to perform the action on
   * @returns The result of the action with TTS data
   */
  async handleQuickAction(action: string, documentIds: string[]) {
    try {
      const response = await fetch(`${this.apiUrl}/api/court-case/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        },
        body: JSON.stringify({
          action: 'prepare_for_court',
          documents: documentIds,
          client_id: this.clientId
        })
      });

      const data = await response.json();
      
      return {
        content: data.strategy || 'Court preparation completed successfully.',
        token_usage: data.token_usage || { total_tokens: 0 },
        cost: data.cost || 0,
        sources: data.sources || []
      };
    } catch (error) {
      console.error('Error in handleQuickAction:', error);
      throw error;
    }
  }
}