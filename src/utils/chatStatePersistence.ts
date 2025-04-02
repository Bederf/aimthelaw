/**
 * Chat State Persistence Utility
 * 
 * Provides functions to save and restore chat state from sessionStorage
 * to prevent state loss during page refreshes or tab switches.
 */

import { Message, Document } from '@/types/ai';
import { supabase } from '@/integrations/supabase/client';

interface ChatState {
  messages: Message[];
  selectedFiles: string[];
  conversationId: string | null;
  clientFiles: Document[];
  timestamp: number;
}

const CHAT_STATE_PREFIX = 'ai_lawyer_chat_state_';
const MESSAGES_PREFIX = 'messages_';

// Store the last save timestamp for each conversation
const lastSaveTimestamps: Record<string, number> = {};
// Store the last message count for each conversation to detect changes
const lastMessageCounts: Record<string, number> = {};

/**
 * Save chat state to sessionStorage
 */
export function saveChatState(
  clientId: string,
  messages: Message[],
  selectedFiles: string[],
  conversationId: string | null,
  clientFiles: Document[] = []
): void {
  if (!clientId) return;
  
  // Check if we're in the middle of creating a new conversation
  // If so, don't save an empty messages array as that would overwrite
  // any existing messages in storage that might be needed
  const isCreatingNewConversation = sessionStorage.getItem('NEW_CONVERSATION_CREATED') === 'true';
  if (isCreatingNewConversation && messages.length === 0) {
    console.log('Skipping chat state save during new conversation creation');
    return;
  }
  
  try {
    const stateToSave: ChatState = {
      messages,
      selectedFiles,
      conversationId,
      clientFiles,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(
      `${CHAT_STATE_PREFIX}${clientId}`,
      JSON.stringify(stateToSave)
    );
    
    // Also save state in localStorage for more persistence across browser sessions
    try {
      localStorage.setItem(
        `${CHAT_STATE_PREFIX}${clientId}`,
        JSON.stringify(stateToSave)
      );
    } catch (localStorageError) {
      console.warn('Failed to save chat state to localStorage (falling back to sessionStorage only):', localStorageError);
    }
    
    console.log(`Chat state saved for client ${clientId}:`, {
      messageCount: messages.length,
      selectedFilesCount: selectedFiles.length,
      clientFilesCount: clientFiles.length,
      conversationId,
      timestamp: new Date().toLocaleTimeString()
    });
  } catch (e) {
    console.error('Failed to save chat state:', e);
  }
}

/**
 * Restore chat state from sessionStorage
 * Returns null if no state is found or if state is too old
 */
export function restoreChatState(
  clientId: string,
  maxAgeMs: number = 30 * 60 * 1000 // 30 minutes by default (increased from 5)
): ChatState | null {
  if (!clientId) return null;
  
  try {
    // Try sessionStorage first
    let savedStateJson = sessionStorage.getItem(`${CHAT_STATE_PREFIX}${clientId}`);
    
    // If not in sessionStorage, try localStorage as fallback
    if (!savedStateJson) {
      savedStateJson = localStorage.getItem(`${CHAT_STATE_PREFIX}${clientId}`);
      if (savedStateJson) {
        console.log(`Restored chat state from localStorage for client ${clientId}`);
      }
    }
    
    if (!savedStateJson) {
      console.log(`No saved chat state found for client ${clientId}`);
      return null;
    }
    
    const savedState = JSON.parse(savedStateJson) as ChatState;
    
    // Check if state is recent
    const isRecent = Date.now() - savedState.timestamp < maxAgeMs;
    if (!isRecent) {
      // Don't clear old state immediately, just log a warning
      console.warn(`Using stale chat state for client ${clientId} from ${new Date(savedState.timestamp).toLocaleTimeString()}`);
      // Only return null if the state is extremely old (more than 24 hours)
      if (Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000) {
        console.log(`Discarding extremely stale chat state for client ${clientId}`);
        return null;
      }
    }
    
    console.log(`Chat state restored for client ${clientId}:`, {
      messageCount: savedState.messages.length,
      selectedFilesCount: savedState.selectedFiles.length,
      clientFilesCount: savedState.clientFiles.length,
      conversationId: savedState.conversationId,
      timestamp: new Date(savedState.timestamp).toLocaleTimeString(),
      age: Math.round((Date.now() - savedState.timestamp) / 1000) + ' seconds'
    });
    
    return savedState;
  } catch (e) {
    console.error('Failed to restore chat state:', e);
    return null;
  }
}

/**
 * Clear saved chat state
 */
export function clearChatState(clientId: string): void {
  if (!clientId) return;
  
  try {
    // Clear chat state items
    sessionStorage.removeItem(`${CHAT_STATE_PREFIX}${clientId}`);
    localStorage.removeItem(`${CHAT_STATE_PREFIX}${clientId}`);
    
    // Clear other chat-related session storage items
    sessionStorage.removeItem('CHAT_MESSAGES');
    sessionStorage.removeItem('CHAT_MESSAGES_UPDATED');
    sessionStorage.removeItem('CURRENT_CONVERSATION_ID');
    sessionStorage.removeItem('SELECTED_FILES');
    sessionStorage.removeItem('SELECTED_TRAINING_FILES');
    sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
    sessionStorage.removeItem('QUICK_ACTION_TYPE');
    sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
    sessionStorage.removeItem('UNSENT_INPUT_MESSAGE');
    sessionStorage.removeItem('NEW_CONVERSATION_CREATED');
    
    console.log(`Chat state cleared for client ${clientId} at ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    console.error('Failed to clear chat state:', e);
  }
}

/**
 * Save current conversation to Supabase
 * This ensures that conversations are persisted before logout or session expiration
 */
export async function saveConversationToSupabase(clientId: string, conversationId: string | null): Promise<boolean> {
  if (!clientId || !conversationId) {
    console.log('Cannot save conversation: missing clientId or conversationId');
    return false;
  }

  try {
    // Get messages from storage
    const storageKey = `messages_${clientId}_${conversationId}`;
    const messagesJson = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    
    if (!messagesJson) {
      console.log(`No messages found for conversation ${conversationId}`);
      return false;
    }
    
    const messages = JSON.parse(messagesJson) as Message[];
    
    if (messages.length === 0) {
      console.log(`No messages to save for conversation ${conversationId}`);
      return false;
    }
    
    console.log(`Saving ${messages.length} messages for conversation ${conversationId} to Supabase`);
    
    // First, check if the conversation exists in Supabase
    const { data: conversationData, error: checkError } = await supabase
      .from('conversations')
      .select('id, title, summary')
      .eq('id', conversationId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking if conversation exists:', checkError);
      
      // If the error is because the record doesn't exist, try to create it
      if (checkError.code === 'PGRST116') {
        console.log(`Conversation ${conversationId} not found, creating it`);
        
        // Generate a title from the first few messages
        let title = 'New Conversation';
        if (messages.length > 0) {
          // Use the first user message as the title if available
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.substring(0, 50);
            if (firstUserMessage.content.length > 50) title += '...';
          }
        }
        
        // Create the conversation record
        const { error: insertError } = await supabase
          .from('conversations')
          .insert([{
            id: conversationId,
            client_id: clientId,
            title: title,
            status: 'active',
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('Error creating conversation:', insertError);
          return false;
        }
        
        console.log(`Created conversation ${conversationId} in Supabase`);
      } else {
        // For other errors, just return false
        return false;
      }
    } else if (!conversationData) {
      // Conversation doesn't exist, create it
      console.log(`Conversation ${conversationId} not found, creating it`);
      
      // Generate a title from the first few messages
      let title = 'New Conversation';
      if (messages.length > 0) {
        // Use the first user message as the title if available
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          title = firstUserMessage.content.substring(0, 50);
          if (firstUserMessage.content.length > 50) title += '...';
        }
      }
      
      // Create the conversation record
      const { error: insertError } = await supabase
        .from('conversations')
        .insert([{
          id: conversationId,
          client_id: clientId,
          title: title,
          status: 'active',
          updated_at: new Date().toISOString()
        }]);
        
      if (insertError) {
        console.error('Error creating conversation:', insertError);
        return false;
      }
      
      console.log(`Created conversation ${conversationId} in Supabase`);
    } else {
      // Conversation exists, update it with latest information
      console.log(`Conversation ${conversationId} found, updating it`);
      
      // Generate a summary from all messages
      let summary = '';
      if (messages.length > 0) {
        // Take the latest 5 messages and create a summary
        const recentMessages = messages.slice(-5);
        summary = recentMessages.map(m => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          // Limit each message to 50 chars in the summary
          const content = m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '');
          return `${role}: ${content}`;
        }).join(' | ');
        
        // Limit overall summary length
        if (summary.length > 255) {
          summary = summary.substring(0, 252) + '...';
        }
      }
      
      // Update the conversation record
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          summary: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error('Error updating conversation:', updateError);
        // Continue anyway to save messages
      } else {
        console.log(`Updated conversation ${conversationId} in Supabase`);
      }
    }
    
    // Now save all messages to the conversation_messages table
    let savedCount = 0;
    for (const message of messages) {
      try {
        // Use upsert pattern instead of insert to handle duplicate IDs gracefully
        const { data: upsertResult, error: upsertError } = await supabase
          .from('conversation_messages')
          .upsert([{
            id: message.id,
            conversation_id: conversationId,
            content: message.content,
            role: message.role,
            metadata: message.metadata || {},
            created_at: message.timestamp instanceof Date 
              ? message.timestamp.toISOString() 
              : (typeof message.timestamp === 'string' 
                  ? message.timestamp 
                  : new Date().toISOString()),
            updated_at: new Date().toISOString()
          }], { 
            onConflict: 'id',  // Specify the conflict field (primary key)
            ignoreDuplicates: true // Just skip duplicates rather than updating
          });
          
        if (upsertError) {
          // If there's still an error even with upsert, try again with a new ID
          if (upsertError.code === '23505') { // Duplicate key error code
            console.warn(`Duplicate key for message ${message.id}, trying with new ID`);
            
            // Generate a new ID with a timestamp suffix to ensure uniqueness
            const newId = `${message.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            
            const { error: retryError } = await supabase
              .from('conversation_messages')
              .insert([{
                id: newId,
                conversation_id: conversationId,
                content: message.content,
                role: message.role,
                metadata: message.metadata || {},
                created_at: message.timestamp instanceof Date 
                  ? message.timestamp.toISOString() 
                  : (typeof message.timestamp === 'string' 
                      ? message.timestamp 
                      : new Date().toISOString()),
                updated_at: new Date().toISOString()
              }]);
              
            if (retryError) {
              console.error(`Failed to save message with new ID ${newId}:`, retryError);
            } else {
              console.log(`Saved message with regenerated ID ${newId}`);
              savedCount++;
            }
          } else {
            console.error(`Error upserting message ${message.id}:`, upsertError);
          }
        } else {
          savedCount++;
        }
      } catch (msgError) {
        console.error(`Unexpected error saving message ${message.id}:`, msgError);
        // Continue to next message despite the error
      }
    }
    
    // Also update or create conversation_states
    try {
      // Prepare the conversation state data
      const stateData = {
        conversation_id: conversationId,
        client_id: clientId,
        messages: messages,
        current_node: 'chat',
        awaiting_human_input: true,
        updated_at: new Date().toISOString()
      };
      
      // First, check if a record already exists
      const { data: existingState, error: checkError } = await supabase
        .from('conversation_states')
        .select('id')
        .eq('conversation_id', conversationId)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing conversation state:', checkError);
      }
      
      if (existingState) {
        // Record exists, use update
        console.log(`Updating existing conversation state with ID ${existingState.id}`);
        const { error: updateError } = await supabase
          .from('conversation_states')
          .update(stateData)
          .eq('id', existingState.id);
          
        if (updateError) {
          console.error('Error updating conversation state:', updateError);
        } else {
          console.log(`Successfully updated conversation state for ${conversationId}`);
        }
      } else {
        // No record exists, insert a new one
        // First create a predictable ID
        const stateId = `${conversationId}`; // Use the conversation ID itself
        
        const { error: insertError } = await supabase
          .from('conversation_states')
          .insert([{
            ...stateData,
            id: stateId
          }]);
          
        if (insertError) {
          // If insert fails due to ID conflict, try with a random UUID
          if (insertError.code === '23505') { // Duplicate key error
            console.warn(`Conflict on ID ${stateId}, trying with random UUID`);
            const { error: retryError } = await supabase
              .from('conversation_states')
              .insert([{
                ...stateData,
                id: `${conversationId}-${Date.now()}`
              }]);
              
            if (retryError) {
              console.error('Error inserting conversation state with retry:', retryError);
            } else {
              console.log(`Successfully created conversation state for ${conversationId} with random ID`);
            }
          } else {
            console.error('Error inserting conversation state:', insertError);
          }
        } else {
          console.log(`Successfully created conversation state for ${conversationId}`);
        }
      }
    } catch (stateError) {
      console.error('Error managing conversation state:', stateError);
      // Continue even if state management fails
    }
    
    console.log(`Successfully saved ${savedCount} of ${messages.length} messages to Supabase`);
    return true;
  } catch (error) {
    console.error('Error saving conversation to Supabase:', error);
    return false;
  }
}

/**
 * Clear all saved chat messages for a specific client
 * This is useful on logout to clear all message storage
 */
export function clearAllChatMessages(clientId?: string): void {
  try {
    // If clientId is provided, only clear messages for that client
    if (clientId) {
      // Clear from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(`${MESSAGES_PREFIX}${clientId}_`) || 
          key.startsWith(`${CHAT_STATE_PREFIX}${clientId}`)
        )) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear from sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith(`${MESSAGES_PREFIX}${clientId}_`) || 
          key.startsWith(`${CHAT_STATE_PREFIX}${clientId}`)
        )) {
          sessionStorage.removeItem(key);
        }
      }
      
      console.log(`Cleared all chat messages for client ${clientId}`);
    } 
    // Otherwise clear all chat messages for all clients
    else {
      // Clear from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(MESSAGES_PREFIX) || 
          key.startsWith(CHAT_STATE_PREFIX)
        )) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear from sessionStorage
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith(MESSAGES_PREFIX) || 
          key.startsWith(CHAT_STATE_PREFIX)
        )) {
          sessionStorage.removeItem(key);
        }
      }
      
      console.log('Cleared all chat messages for all clients');
    }
    
    // Clear quick action related flags
    sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
    sessionStorage.removeItem('QUICK_ACTION_TYPE');
    sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
    sessionStorage.removeItem('QUICK_ACTION_SELECTED_DOCS');
    sessionStorage.removeItem('HAS_SAVED_MESSAGES');
    sessionStorage.removeItem('LAST_TTS_CONTENT');
    sessionStorage.removeItem('ENABLE_TTS_FOR_LAST_MESSAGE');
    
  } catch (error) {
    console.error('Error clearing chat messages:', error);
  }
}

// Find all active conversations in localStorage/sessionStorage
export function findActiveConversations(): Array<{clientId: string, conversationId: string}> {
  const conversations: Array<{clientId: string, conversationId: string}> = [];
  
  try {
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MESSAGES_PREFIX)) {
        const parts = key.split('_');
        if (parts.length >= 3) {
          const clientId = parts[1];
          const conversationId = parts.slice(2).join('_');
          conversations.push({ clientId, conversationId });
        }
      }
    }
    
    // Check sessionStorage too
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(MESSAGES_PREFIX)) {
        const parts = key.split('_');
        if (parts.length >= 3) {
          const clientId = parts[1];
          const conversationId = parts.slice(2).join('_');
          
          // Only add if not already in the list
          const exists = conversations.some(
            conv => conv.clientId === clientId && conv.conversationId === conversationId
          );
          
          if (!exists) {
            conversations.push({ clientId, conversationId });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding active conversations:', error);
  }
  
  return conversations;
}

// Save all active conversations to Supabase
export async function saveAllConversationsToSupabase(): Promise<void> {
  try {
    const activeConversations = findActiveConversations();
    console.log(`Saving ${activeConversations.length} active conversations to Supabase`);
    
    for (const { clientId, conversationId } of activeConversations) {
      await saveConversationToSupabase(clientId, conversationId);
    }
  } catch (error) {
    console.error('Error saving all conversations to Supabase:', error);
  }
}

// Set up an event listener to clear messages on logout
document.addEventListener('DOMContentLoaded', () => {
  // Listen for a custom event that can be dispatched when user logs out
  window.addEventListener('user-logout', async () => {
    console.log('Logout detected, saving conversations to Supabase and clearing messages');
    
    // First save all conversations to Supabase with the more comprehensive method
    try {
      const activeConversations = findActiveConversations();
      console.log(`Saving ${activeConversations.length} active conversations to Supabase`);
      
      for (const { clientId, conversationId } of activeConversations) {
        await saveConversationComplete(clientId, conversationId)
          .catch(error => {
            console.error(`Error saving conversation ${conversationId} on logout:`, error);
          });
      }
    } catch (error) {
      console.error('Error during logout conversation saving:', error);
    }
    
    // Then clear all messages
    clearAllChatMessages();
  });
});

/**
 * Save messages to the chat_history table for semantic search
 * This function includes deduplication logic to prevent redundant saves
 */
export async function saveToChatHistory(
  clientId: string, 
  conversationId: string, 
  messages: Message[],
  forceSave = false
): Promise<number> {
  if (!clientId || !conversationId || !messages.length) {
    return 0;
  }

  // Generate a cache key for this conversation
  const cacheKey = `${clientId}:${conversationId}`;
  const now = Date.now();
  const lastSaveTime = lastSaveTimestamps[cacheKey] || 0;
  const lastCount = lastMessageCounts[cacheKey] || 0;
  const timeSinceLastSave = now - lastSaveTime;
  
  // Skip if we've saved recently (within 30 seconds) and the message count hasn't changed,
  // unless forceSave is true
  if (!forceSave && 
      lastSaveTime > 0 && 
      timeSinceLastSave < 30000 && 
      lastCount === messages.length) {
    console.log(`Skipping chat_history save for ${conversationId} - no changes detected and last saved ${Math.round(timeSinceLastSave/1000)}s ago`);
    return 0;
  }
  
  // Update our tracking variables before saving
  lastSaveTimestamps[cacheKey] = now;
  lastMessageCounts[cacheKey] = messages.length;
  
  console.log(`Saving ${messages.length} messages to chat_history table for conversation ${conversationId}`);
  
  try {
    // Only include messages with valid content for semantic search
    const validMessages = messages.filter(m => 
      typeof m.content === 'string' && 
      m.content.trim().length > 0
    );
    
    if (validMessages.length === 0) {
      console.log('No valid messages to save to chat_history');
      return 0;
    }
    
    // Convert messages to the format expected by the chat_history table
    // Each message needs to be inserted as a separate row
    const messagesToInsert = validMessages.map(message => ({
      id: message.id,
      chat_id: conversationId,
      role: message.role,
      text: message.content,
      created_at: message.timestamp instanceof Date 
        ? message.timestamp.toISOString() 
        : (typeof message.timestamp === 'string' 
            ? message.timestamp 
            : new Date().toISOString())
    }));
    
    // Use multiple upsert operations to avoid conflicts
    let successCount = 0;
    for (const msg of messagesToInsert) {
      const { error } = await supabase
        .from('chat_history')
        .upsert(msg, { 
          onConflict: 'id',
          ignoreDuplicates: false // Update on conflict
        });
      
      if (error) {
        console.error(`Error saving message to chat_history table:`, error);
      } else {
        successCount++;
      }
    }
    
    console.log(`Successfully saved ${successCount} of ${validMessages.length} messages to chat_history table`);
    return successCount;
  } catch (error) {
    console.error('Error saving to chat_history:', error);
    return 0;
  }
}

// Enhanced version of saveConversationToSupabase that also saves to chat_history
export async function saveConversationComplete(clientId: string, conversationId: string | null): Promise<boolean> {
  // Skip if no clientId or conversationId
  if (!clientId || !conversationId) {
    console.log('Cannot save conversation: missing clientId or conversationId');
    return false;
  }

  // Get messages from storage
  const storageKey = `messages_${clientId}_${conversationId}`;
  const messagesJson = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
  
  if (!messagesJson) {
    console.log(`No messages found for conversation ${conversationId}`);
    return false;
  }
  
  try {
    const messages = JSON.parse(messagesJson) as Message[];
    
    if (messages.length === 0) {
      console.log(`No messages to save for conversation ${conversationId}`);
      return false;
    }
    
    // First save to the main conversation tables
    const mainSaveSuccess = await saveConversationToSupabase(clientId, conversationId);
    
    // Regardless of main save result, try to save to chat_history as well
    // since it has its own deduplication logic
    try {
      await saveToChatHistory(clientId, conversationId, messages);
    } catch (historyError) {
      // Log but don't fail the overall operation
      console.error('Error saving to chat history:', historyError);
    }
    
    return mainSaveSuccess;
  } catch (error) {
    console.error('Error in saveConversationComplete:', error);
    return false;
  }
}

const saveChatStateToSupabase = async (conversationId: string, messages: Message[]) => {
  try {
    // Convert messages to the format expected by the chat_history table
    // Each message needs to be inserted as a separate row
    const messagesToInsert = messages.map(message => ({
      id: message.id,
      chat_id: conversationId,
      role: message.role,
      text: message.content,
      created_at: message.timestamp instanceof Date 
        ? message.timestamp.toISOString() 
        : (typeof message.timestamp === 'string' 
            ? message.timestamp 
            : new Date().toISOString())
    }));
    
    // Use multiple upsert operations instead of a single batch
    let successCount = 0;
    for (const msg of messagesToInsert) {
      const { error } = await supabase
        .from('chat_history')
        .upsert(msg, { 
          onConflict: 'id',
          ignoreDuplicates: false // Update existing records
        });
      
      if (error) {
        console.error(`Error saving message to chat_history:`, error);
      } else {
        successCount++;
      }
    }
    
    console.log(`Successfully saved ${successCount} of ${messages.length} messages to chat_history table`);
    return { success: true, count: successCount };
  } catch (error) {
    console.error('Error saving chat state:', error);
    throw error;
  }
}; 