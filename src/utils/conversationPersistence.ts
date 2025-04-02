/**
 * Conversation Persistence Utilities
 * 
 * Functions to save and load conversation IDs to maintain context between sessions
 */

/**
 * Save a conversation ID to localStorage
 */
export function saveConversationId(clientId: string, conversationId: string): void {
  if (!clientId || !conversationId) return;
  
  try {
    localStorage.setItem(`conversation_${clientId}`, conversationId);
    console.log(`Saved conversation ID to localStorage: ${conversationId}`);
  } catch (error) {
    console.error('Error saving conversation ID:', error);
  }
}

/**
 * Load a conversation ID from localStorage
 */
export function loadConversationId(clientId: string): string | null {
  if (!clientId) return null;
  
  try {
    const conversationId = localStorage.getItem(`conversation_${clientId}`);
    if (conversationId) {
      console.log(`Loaded conversation ID from localStorage: ${conversationId}`);
      return conversationId;
    }
  } catch (error) {
    console.error('Error loading conversation ID:', error);
  }
  
  return null;
}

/**
 * Clear a conversation ID from localStorage
 */
export function clearConversationId(clientId: string): void {
  if (!clientId) return;
  
  try {
    localStorage.removeItem(`conversation_${clientId}`);
    console.log(`Cleared conversation ID for client ${clientId}`);
  } catch (error) {
    console.error('Error clearing conversation ID:', error);
  }
} 