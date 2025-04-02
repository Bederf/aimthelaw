/**
 * Chat Message Utilities
 * 
 * This file contains utilities for handling chat message input and output.
 * It provides a more direct interface for sending, receiving, and managing messages.
 */

import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/ai';
import { MessageRole, MessageSender } from '@/types/chat';
import { saveChatState } from './chatStatePersistence';

/**
 * Chat Message Manager
 * A utility class that handles chat message operations
 */
export class ChatMessageManager {
  private clientId: string;
  private conversationId: string | null;
  private messages: Message[];
  private onMessagesChange: (messages: Message[]) => void;
  private aiService: any; // Service for sending messages to AI

  /**
   * Create a new ChatMessageManager
   * @param clientId - The ID of the client
   * @param conversationId - The ID of the conversation (null for new conversations)
   * @param initialMessages - Initial messages to populate the chat
   * @param onMessagesChange - Callback function when messages are updated
   * @param aiService - Service for sending messages to AI
   */
  constructor(
    clientId: string,
    conversationId: string | null,
    initialMessages: Message[],
    onMessagesChange: (messages: Message[]) => void,
    aiService: any
  ) {
    this.clientId = clientId;
    this.conversationId = conversationId;
    this.messages = [...initialMessages];
    this.onMessagesChange = onMessagesChange;
    this.aiService = aiService;
  }

  /**
   * Set the conversation ID
   * @param conversationId - The new conversation ID
   */
  setConversationId(conversationId: string | null): void {
    this.conversationId = conversationId;
  }

  /**
   * Get all messages
   * @returns Array of messages
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Add a message to the chat
   * @param message - The message to add
   */
  addMessage(message: Message): void {
    // Check if we already have a message with this ID
    const existingIndex = this.messages.findIndex(m => m.id === message.id);
    
    if (existingIndex >= 0) {
      // Replace the existing message
      this.messages = [
        ...this.messages.slice(0, existingIndex),
        message,
        ...this.messages.slice(existingIndex + 1)
      ];
    } else {
      // Add as a new message
      this.messages = [...this.messages, message];
    }
    
    // Call the onChange callback
    this.onMessagesChange(this.messages);
    
    // Persist to storage for resilience
    this.persistMessages();
  }

  /**
   * Remove a message from the chat
   * @param messageId - The ID of the message to remove
   */
  removeMessage(messageId: string): void {
    this.messages = this.messages.filter(m => m.id !== messageId);
    this.onMessagesChange(this.messages);
    this.persistMessages();
  }

  /**
   * Replace the loading placeholder message with an actual message
   * @param placeholderId - The ID of the placeholder message
   * @param message - The message to replace it with
   */
  replacePlaceholder(placeholderId: string, message: Message): void {
    const index = this.messages.findIndex(m => m.id === placeholderId);
    if (index >= 0) {
      this.messages = [
        ...this.messages.slice(0, index),
        message,
        ...this.messages.slice(index + 1)
      ];
      this.onMessagesChange(this.messages);
      this.persistMessages();
    } else {
      // If placeholder not found, just add the message
      this.addMessage(message);
    }
  }

  /**
   * Create a user message
   * @param content - The content of the message
   * @param attachments - Optional document attachments
   * @returns The created user message
   */
  createUserMessage(content: string, attachments?: any[]): Message {
    return {
      id: uuidv4(),
      role: MessageRole.USER,
      sender: MessageSender.USER,
      content: content.trim(),
      timestamp: new Date(),
      conversation_id: this.conversationId || 'pending',
      attachments: attachments || undefined
    };
  }

  /**
   * Create an AI placeholder message (loading indicator)
   * @param documentCount - Number of documents being analyzed (for custom message)
   * @returns The created placeholder message
   */
  createPlaceholderMessage(documentCount: number = 0): Message {
    const content = documentCount > 0
      ? `<div class="flex items-center"><span class="animate-pulse mr-2">⏳</span> Analyzing ${documentCount} document(s) and thinking...</div>`
      : `<div class="flex items-center"><span class="animate-pulse mr-2">⏳</span> AI is thinking...</div>`;
    
    return {
      id: `placeholder-${Date.now()}`,
      role: MessageRole.ASSISTANT,
      sender: MessageSender.AI,
      content,
      timestamp: new Date(),
      conversation_id: this.conversationId || 'pending',
      isPlaceholder: true
    };
  }

  /**
   * Create an AI response message
   * @param content - The content of the message
   * @param metadata - Optional metadata
   * @returns The created AI message
   */
  createAIMessage(content: string, metadata?: any): Message {
    return {
      id: uuidv4(),
      role: MessageRole.ASSISTANT,
      sender: MessageSender.AI,
      content,
      timestamp: new Date(),
      conversation_id: this.conversationId || 'pending',
      metadata
    };
  }

  /**
   * Create a system message (notifications, errors, etc.)
   * @param content - The content of the message
   * @param isError - Whether this is an error message
   * @returns The created system message
   */
  createSystemMessage(content: string, isError: boolean = false): Message {
    return {
      id: uuidv4(),
      role: MessageRole.SYSTEM,
      sender: MessageSender.SYSTEM,
      content,
      timestamp: new Date(),
      conversation_id: this.conversationId || 'pending',
      error: isError
    };
  }

  /**
   * Send a user message and handle the AI response
   * @param content - The user message content
   * @param documentIds - Selected document IDs to include
   * @param modelId - The AI model to use
   * @param options - Additional options for the request
   * @returns A promise that resolves when the AI has responded
   */
  async sendMessage(
    content: string,
    documentIds: string[] = [],
    modelId: string = 'gpt-4o-mini',
    options: any = {}
  ): Promise<void> {
    if (!content.trim()) return;
    
    try {
      // Create user message
      const userMessage = this.createUserMessage(content, 
        // Create attachments from documentIds if needed
        documentIds.length > 0 ? documentIds.map(id => ({ id })) : undefined
      );
      
      // Add user message to chat
      this.addMessage(userMessage);
      
      // Create and add placeholder message
      const placeholderId = `placeholder-${Date.now()}`;
      const placeholderMessage = this.createPlaceholderMessage(documentIds.length);
      placeholderMessage.id = placeholderId; // Ensure we use the same ID
      
      this.addMessage(placeholderMessage);
      
      // Send to AI service
      const result = await this.aiService.sendMessage(
        content,
        documentIds,
        modelId,
        this.conversationId,
        this.messages.filter(m => !m.isPlaceholder), // Don't include placeholders in context
        options
      );
      
      // Create AI response message
      const aiMessage = this.createAIMessage(
        // Handle different response formats
        result.message?.response || result.message?.content || result.message || result.response || 
        "I'm here to help! It seems I didn't receive a proper response from my knowledge system. How can I assist you today?",
        {
          ...result.metadata,
          token_usage: result.token_usage || null,
          referenced_documents: documentIds.length > 0 ? documentIds.map(id => ({ id })) : undefined
        }
      );
      
      // If conversation ID was generated during this call, capture it
      if (result.conversation_id && !this.conversationId) {
        this.setConversationId(result.conversation_id);
      }
      
      // Replace placeholder with actual response
      this.replacePlaceholder(placeholderId, aiMessage);
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create error message
      const errorMessage = this.createSystemMessage(
        "I'm sorry, I encountered an error while processing your request. Please try again.",
        true
      );
      
      // Replace placeholder with error message
      this.replacePlaceholder(`placeholder-${Date.now()}`, errorMessage);
      
      throw error;
    }
  }

  /**
   * Extract the meaningful content from a Prepare for Court result
   * @param result - The API result
   * @returns The extracted content or null if nothing meaningful found
   */
  private extractPrepareForCourtContent(result: any): string | null {
    console.log("[ChatMessageManager] Extracting Prepare for Court content from:", result);
    
    // Log the detailed structure for debugging
    console.log("Result keys:", Object.keys(result));
    console.log("Result data keys:", result.data ? Object.keys(result.data) : "No data object");
    
    // Check for top-level relevant fields
    if (result.court_preparation && typeof result.court_preparation === 'string' && result.court_preparation.length > 20) {
      console.log(`Using court_preparation field (${result.court_preparation.length} chars)`);
      return result.court_preparation;
    }
    
    // Check for content field (common in API responses)
    if (result.content && typeof result.content === 'string' && result.content.length > 50) {
      console.log(`Using content field (${result.content.length} chars)`);
      return result.content;
    }
    
    // Check nested data structures that often contain the actual result
    if (result.data) {
      // Common fields in the data object that might contain the result
      const contentFields = [
        'court_preparation', 
        'prepared_content', 
        'summary', 
        'analysis', 
        'content',
        'result',
        'response'
      ];
      
      for (const field of contentFields) {
        if (result.data[field] && typeof result.data[field] === 'string' && result.data[field].length > 50) {
          console.log(`Using data.${field} field (${result.data[field].length} chars)`);
          return result.data[field];
        }
      }
      
      // If data has a court_case field, it might be an object with details
      if (result.data.court_case && typeof result.data.court_case === 'object') {
        // Try to extract relevant information from the court_case object
        const courtCase = result.data.court_case;
        
        // Build a comprehensive summary of the court case
        let courtCaseContent = "";
        
        if (courtCase.summary) {
          courtCaseContent += `## Summary\n\n${courtCase.summary}\n\n`;
        }
        
        if (courtCase.analysis) {
          courtCaseContent += `## Analysis\n\n${courtCase.analysis}\n\n`;
        }
        
        if (courtCase.key_points && Array.isArray(courtCase.key_points)) {
          courtCaseContent += `## Key Points\n\n`;
          courtCase.key_points.forEach((point: string, index: number) => {
            courtCaseContent += `${index + 1}. ${point}\n`;
          });
          courtCaseContent += "\n";
        }
        
        if (courtCase.recommendations) {
          courtCaseContent += `## Recommendations\n\n${courtCase.recommendations}\n\n`;
        }
        
        if (courtCaseContent.length > 0) {
          console.log(`Using compiled court_case content (${courtCaseContent.length} chars)`);
          return courtCaseContent;
        }
      }
    }
    
    // Try extracting from any string field that might contain meaningful content
    const significantFields = Object.entries(result)
      .filter(([key, value]) => 
        typeof value === 'string' && 
        value.length > 100 && // Larger threshold for significance
        !key.includes('id') &&
        !key.includes('timestamp') &&
        !key.includes('token') &&
        !key.includes('model')
      );
    
    if (significantFields.length > 0) {
      console.log(`Found ${significantFields.length} significant content fields:`, 
        significantFields.map(([key]) => key));
      
      // Use the longest content as it's likely the most comprehensive
      const [largestKey, largestValue] = significantFields.reduce(
        (largest, current) => 
          (current[1] as string).length > (largest[1] as string).length ? current : largest
      );
      
      console.log(`Using largest content field: ${largestKey} (${(largestValue as string).length} chars)`);
      return largestValue as string;
    }
    
    // Check for raw content
    if (result.raw_content && typeof result.raw_content === 'string' && result.raw_content.length > 50) {
      console.log(`Using raw_content field (${result.raw_content.length} chars)`);
      return result.raw_content;
    }
    
    // If still nothing, check if the result itself is a string with substantial content
    if (typeof result === 'string' && result.length > 100) {
      console.log(`Using result as a string (${result.length} chars)`);
      return result;
    }
    
    // If we've exhausted all options and found nothing meaningful
    console.warn("No meaningful content found in Prepare for Court result");
    return null;
  }

  /**
   * Handle a quick action result and add it to the chat
   * @param action - The quick action type
   * @param result - The result from the quick action
   * @param documentIds - The document IDs used in the action
   * @returns The created message
   */
  handleQuickActionResult(action: string, result: any, documentIds: string[] = []): Message {
    console.log(`[ChatMessageManager] Processing ${action} result:`, result);
    
    // Generate display content based on the action and result
    let displayContent = "";
    
    // Process specific action types
    if (action === "Prepare for Court") {
      // Try to extract the meaningful content using our specialized extractor
      const extractedContent = this.extractPrepareForCourtContent(result);
      
      if (extractedContent) {
        displayContent = `## Prepare for Court\n\n${extractedContent}`;
      } else {
        // If we couldn't extract meaningful content, let's create something useful from the metadata
        if (result.metadata && typeof result.metadata === 'object') {
          const metadataContent = Object.entries(result.metadata)
            .filter(([key, value]) => 
              typeof value === 'string' && 
              value.length > 20 &&
              !key.includes('id') &&
              !key.includes('timestamp')
            )
            .map(([key, value]) => 
              `### ${key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}\n\n${value}`
            )
            .join('\n\n');
          
          if (metadataContent) {
            displayContent = `## Prepare for Court\n\n${metadataContent}`;
          }
        }
        
        // If still no content, use a fallback
        if (!displayContent) {
          // Look for alternative sources of content
          if (result.formatted_response) {
            displayContent = result.formatted_response;
          } else if (result.response) {
            displayContent = `## Prepare for Court\n\n${result.response}`;
          } else if (result.content) {
            displayContent = `## Prepare for Court\n\n${result.content}`;
          } else {
            // Last resort - show a detailed technical message
            displayContent = `## Prepare for Court\n\nThe court preparation was completed, but the detailed results could not be displayed. This might be due to a formatting issue in the API response.\n\n### Technical Details\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
          }
        }
      }
    }
    else if (action === "Extract Dates" && result.dates && Array.isArray(result.dates)) {
      // Format date extraction results
      let content = `## Dates Extracted\n\nThe following dates were found in your documents:\n\n`;
      
      result.dates.forEach((date: any) => {
        if (typeof date === 'string') {
          content += `- **${date}**\n`;
        } else {
          const dateText = date.date || date.text || '';
          const description = date.description || date.event || date.context || '';
          const source = date.source || date.source_document || '';
          
          content += `- **${dateText}**`;
          if (description) content += `: ${description}`;
          if (source) content += ` (${source})`;
          content += '\n';
        }
      });
      
      displayContent = content;
    }
    else if (action === "Summarize Document") {
      // Handle document summary
      if (result.summary && typeof result.summary === 'string') {
        displayContent = `## Document Summary\n\n${result.summary}`;
      } else if (result.content && typeof result.content === 'string') {
        displayContent = `## Document Summary\n\n${result.content}`;
      } else if (result.formatted_response) {
        displayContent = result.formatted_response;
      } else {
        displayContent = `## Document Summary\n\nSummarization completed, but the content could not be displayed in a readable format.`;
      }
    }
    else if (action === "Reply to Letter") {
      // Handle letter reply
      if (result.reply && typeof result.reply === 'string') {
        displayContent = `## Reply Draft\n\n${result.reply}`;
      } else if (result.content && typeof result.content === 'string') {
        displayContent = `## Reply Draft\n\n${result.content}`;
      } else if (result.response && typeof result.response === 'string') {
        displayContent = `## Reply Draft\n\n${result.response}`;
      } else if (result.formatted_response) {
        displayContent = result.formatted_response;
      } else {
        displayContent = `## Reply Draft\n\nA reply has been generated, but it could not be displayed in a readable format.`;
      }
    }
    else if (result.formatted_response || result.content || result.response) {
      // Use pre-formatted content if available for other action types
      displayContent = result.formatted_response || result.content || result.response;
    }
    
    // If we still don't have content, create a basic message
    if (!displayContent || displayContent.trim().length < 10) {
      console.warn(`No valid display content found for ${action}, creating placeholder message`);
      displayContent = `## ${action}\n\nThe action completed, but no results were returned in a readable format.`;
    }
    
    // Create the message
    const message = this.createAIMessage(displayContent, {
      type: 'action_result',
      action: action,
      documentIds: documentIds,
      token_usage: result.token_usage || null
    });
    
    // Add it to the chat
    this.addMessage(message);
    
    // Store the message ID for recovery in case of page refreshes
    if (message.id) {
      sessionStorage.setItem('LAST_AI_MESSAGE_ID', message.id);
      sessionStorage.setItem('LAST_MESSAGE_ACTION', action);
      sessionStorage.setItem('LAST_MESSAGE_TIMESTAMP', Date.now().toString());
    }
    
    return message;
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
    this.onMessagesChange(this.messages);
    this.persistMessages();
  }

  /**
   * Persist messages to storage
   */
  private persistMessages(): void {
    if (!this.clientId) return;
    
    try {
      // Save to both localStorage and sessionStorage for redundancy
      const storageKey = `messages_${this.clientId}_${this.conversationId || 'pending'}`;
      localStorage.setItem(storageKey, JSON.stringify(this.messages));
      sessionStorage.setItem(storageKey, JSON.stringify(this.messages));
      
      // Also use the chat state persistence utility
      if (this.conversationId) {
        saveChatState(this.clientId, this.messages, [], this.conversationId, []);
      }
    } catch (error) {
      console.error('Error persisting messages:', error);
    }
  }
}

/**
 * Create a simple chat message
 * @param role - The role of the message sender
 * @param sender - The sender of the message
 * @param content - The content of the message
 * @param conversationId - Optional conversation ID
 * @returns A new Message object
 */
export function createMessage(
  role: MessageRole,
  sender: MessageSender,
  content: string,
  conversationId?: string | null
): Message {
  return {
    id: uuidv4(),
    role,
    sender,
    content,
    timestamp: new Date(),
    conversation_id: conversationId || 'pending'
  };
}

/**
 * Format action results into a markdown message
 * @param action - The action type
 * @param result - The result data
 * @returns Formatted markdown string
 */
export function formatActionResultAsMarkdown(action: string, result: any): string {
  if (!result) {
    return `## ${action}\n\nThe action completed, but no results were returned.`;
  }
  
  // Handle specific action types
  switch (action) {
    case 'Extract Dates':
      if (result.dates && Array.isArray(result.dates)) {
        let content = `## Dates Extracted\n\nThe following dates were found in your documents:\n\n`;
        
        result.dates.forEach((date: any) => {
          if (typeof date === 'string') {
            content += `- **${date}**\n`;
          } else {
            const dateText = date.date || date.text || '';
            const description = date.description || date.event || date.context || '';
            const source = date.source || date.source_document || '';
            
            content += `- **${dateText}**`;
            if (description) content += `: ${description}`;
            if (source) content += ` (${source})`;
            content += '\n';
          }
        });
        
        return content;
      }
      break;
      
    case 'Summarize Document':
      if (result.summary) {
        return `## Document Summary\n\n${result.summary}`;
      } else if (result.content) {
        return `## Document Summary\n\n${result.content}`;
      }
      break;
      
    case 'Reply to Letter':
      if (result.reply) {
        return result.reply;
      } else if (result.response) {
        return result.response;
      } else if (result.content) {
        return result.content;
      }
      break;
      
    case 'Prepare for Court':
      if (result.court_preparation) {
        return `## Prepare for Court\n\n${result.court_preparation}`;
      } else if (result.strategy) {
        return `## Prepare for Court\n\n${result.strategy}`;
      } else if (result.summary) {
        return `## Prepare for Court\n\n${result.summary}`;
      } else if (result.analysis) {
        return `## Prepare for Court\n\n${result.analysis}`;
      } else if (result.content) {
        return `## Prepare for Court\n\n${result.content}`;
      } else if (result.response) {
        return `## Prepare for Court\n\n${result.response}`;
      }
      break;
  }

  // Generic handling if specific format not recognized
  if (result.formatted_response) {
    return result.formatted_response;
  } else if (result.content) {
    return result.content;
  } else if (result.response) {
    return result.response;
  } else if (typeof result === 'string') {
    return result;
  } else {
    try {
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return `## ${action}\n\nAction completed successfully.`;
    }
  }
}