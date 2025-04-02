import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/lib/api';

export class LangchainService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Processes a message using Langchain with memory
   * @param message The user message
   * @param conversationId The conversation ID for memory retrieval
   * @param documentIds Array of document IDs to use for context
   * @param model The LLM model to use
   * @returns The AI response
   */
  async processMessage(
    message: string,
    conversationId: string,
    documentIds: string[] = [],
    model: string = 'gpt-4'
  ) {
    try {
      const response = await fetch(`${this.apiUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          query: message,
          client_id: conversationId,
          documents: documentIds,
          use_rag: documentIds.length > 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process message with Langchain');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in processMessage:', error);
      throw error;
    }
  }

  /**
   * Generates a summary of the conversation using Langchain
   * @param conversationId The conversation ID
   * @param model The LLM model to use
   * @returns The conversation summary
   */
  async generateSummary(conversationId: string, model: string = 'gpt-3.5-turbo') {
    try {
      const response = await fetch(`${this.apiUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          query: "Generate a summary of our conversation",
          client_id: conversationId,
          use_rag: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate summary');
      }

      const data = await response.json();
      
      // Update the conversation summary in the database
      const { error } = await supabase
        .from('conversations')
        .update({ summary: data.summary })
        .eq('id', conversationId);
        
      if (error) console.error('Error updating summary in database:', error);
      
      return data;
    } catch (error) {
      console.error('Error in generateSummary:', error);
      throw error;
    }
  }

  /**
   * Retrieves the conversation history from the database
   * @param conversationId The conversation ID
   * @returns The conversation history
   */
  async getConversationHistory(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error retrieving conversation history:', error);
      throw error;
    }
  }
} 