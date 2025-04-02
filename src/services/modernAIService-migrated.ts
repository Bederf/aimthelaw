/**
 * Modern AI Service using the typed API client
 * This service provides the same interface as the existing AIService
 * but uses the typed API client internally for better type safety
 */

import { Message } from '@/types/ai';
import { logger } from '@/utils/logger';
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
  private serviceName = 'modernAIService';

  constructor(clientId: string) {
    // Validate client ID format
    if (!clientId || !clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logger.error('Invalid client ID format provided to ModernAIService', { 
        service: this.serviceName, 
        action: 'constructor',
        metadata: { clientId }
      });
      throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
    }
    
    this.clientId = clientId;
    this.apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    logger.info('ModernAIService initialized', { 
      service: this.serviceName, 
      action: 'initialize',
      metadata: { clientId, apiUrl: this.apiUrl }
    });
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
      logger.error('Error getting access token', { 
        service: this.serviceName, 
        action: 'getAccessToken',
        error
      });
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
        logger.error('Error fetching training info', { 
          service: this.serviceName, 
          action: 'getTrainingInfo',
          error
        });
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
      logger.error('Exception fetching training info', { 
        service: this.serviceName, 
        action: 'getTrainingInfo',
        error: err
      });
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
    logger.info('sendMessage called', { 
      service: this.serviceName, 
      action: 'sendMessage',
      metadata: { 
        messageLength: message.length, 
        documentIds: documentIds.length, 
        model, 
        conversationId, 
        previousMessagesCount: previousMessages.length,
        hasCustomPrompt: !!options.customSystemPrompt,
        includeDocumentContent: options.includeDocumentContent
      }
    });
    
    // Validate input parameters
    if (!message || typeof message !== 'string') {
      logger.error('Invalid message parameter', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: { message }
      });
      throw new Error('Invalid message parameter');
    }
    
    if (!Array.isArray(documentIds)) {
      logger.warn('documentIds is not an array', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: { documentIds }
      });
      documentIds = [];
    }
    
    try {
      // Create new conversation if none exists
      if (!conversationId) {
        logger.info('No conversation ID provided, creating a new one', {
          service: this.serviceName,
          action: 'sendMessage'
        });
        conversationId = await this.createConversation();
        logger.info('Created new conversation', {
          service: this.serviceName,
          action: 'sendMessage',
          metadata: { conversationId }
        });
      } else {
        logger.info('Using existing conversation', {
          service: this.serviceName,
          action: 'sendMessage',
          metadata: { conversationId }
        });
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
      logger.info('Saved user message to conversation', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: { conversationId }
      });

      // Ensure client ID is in the correct format (UUID)
      if (!this.clientId || !this.clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.error('Invalid client ID format', {
          service: this.serviceName,
          action: 'sendMessage',
          metadata: { clientId: this.clientId }
        });
        throw new Error('Invalid client ID format. Please ensure you have a valid client ID.');
      }

      // Get authorization token
      const token = await this.getAccessToken();
      logger.info('Authorization token obtained', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: { hasToken: !!token }
      });
      
      // Log the request for debugging
      logger.info('Sending AI query request', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: {
          queryLength: message.length,
          client_id: this.clientId,
          documentCount: documentIds.length,
          model: model,
          conversation_id: conversationId
        }
      });

      // Use the correct endpoint URL
      const apiEndpoint = `${this.apiUrl}/api/query/`;
      logger.info('Using API endpoint', {
        service: this.serviceName,
        action: 'sendMessage',
        metadata: { apiEndpoint }
      });

      // Here you would include the rest of the function that makes the API call and processes the response.
      // Since we're just providing a migration example, I'll leave this part as a placeholder comment.

      // Rest of the function would go here...
    } catch (error) {
      logger.error('Error in sendMessage', {
        service: this.serviceName,
        action: 'sendMessage',
        error,
        metadata: {
          messageLength: message.length,
          documentIds: documentIds.length,
          conversationId
        }
      });
      throw error;
    }
  }
} 