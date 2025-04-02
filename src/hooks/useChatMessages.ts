import { useState, useCallback, useEffect, useMemo } from 'react';
import { Message } from '@/types/ai';
import { MessageRole, MessageSender } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessageManager } from '@/utils/chatMessageUtils';

/**
 * Hook for managing chat messages with the ChatMessageManager
 */
export function useChatMessages({
  clientId,
  conversationId,
  aiService,
  initialMessages = []
}: {
  clientId: string;
  conversationId: string | null;
  aiService: any;
  initialMessages?: Message[];
}) {
  // State for messages
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  
  // Create message manager
  const chatManager = useMemo(() => {
    return new ChatMessageManager(
      clientId,
      conversationId,
      initialMessages,
      (updatedMessages) => setMessages(updatedMessages),
      aiService
    );
  }, [clientId, conversationId, aiService]); // Note: initialMessages intentionally not in dependency array
  
  // Update conversation ID when it changes
  useEffect(() => {
    chatManager.setConversationId(conversationId);
  }, [chatManager, conversationId]);
  
  // Load saved messages when conversation ID changes
  useEffect(() => {
    if (!conversationId) return;
    
    try {
      // Attempt to get messages from storage
      const storageKey = `messages_${clientId}_${conversationId}`;
      const savedMessagesStr = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
      
      if (savedMessagesStr) {
        const savedMessages = JSON.parse(savedMessagesStr) as Message[];
        if (savedMessages.length > 0 && messages.length === 0) {
          setMessages(savedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading saved messages:', error);
    }
  }, [clientId, conversationId, messages.length]);
  
  // Handle sending messages
  const sendMessage = useCallback(async (
    content?: string,
    documentIds: string[] = [],
    modelId: string = 'gpt-4o-mini',
    options: any = {}
  ) => {
    // If content is not provided, use the input message state
    const messageContent = content || inputMessage;
    if (!messageContent.trim() || loading) return;
    
    try {
      setLoading(true);
      
      // Clear input immediately for better UX
      setInputMessage('');
      
      // Use the manager to send the message
      await chatManager.sendMessage(messageContent, documentIds, modelId, options);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }, [chatManager, inputMessage, loading, setInputMessage]);
  
  // Handle quick action results
  const handleQuickActionResult = useCallback((
    action: string,
    result: any,
    documentIds: string[] = []
  ) => {
    return chatManager.handleQuickActionResult(action, result, documentIds);
  }, [chatManager]);
  
  // Add a message directly to the chat
  const addMessage = useCallback((message: Message) => {
    chatManager.addMessage(message);
  }, [chatManager]);
  
  // Create a user message
  const createUserMessage = useCallback((content: string, attachments?: any[]) => {
    return chatManager.createUserMessage(content, attachments);
  }, [chatManager]);
  
  // Create an AI message
  const createAIMessage = useCallback((content: string, metadata?: any) => {
    return chatManager.createAIMessage(content, metadata);
  }, [chatManager]);
  
  // Create a system message
  const createSystemMessage = useCallback((content: string, isError: boolean = false) => {
    return chatManager.createSystemMessage(content, isError);
  }, [chatManager]);
  
  // Clear all messages
  const clearMessages = useCallback(() => {
    chatManager.clearMessages();
  }, [chatManager]);
  
  // Generate a welcome message if needed
  const addWelcomeMessage = useCallback(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        sender: MessageSender.AI,
        content: `
          <div class="p-4 bg-primary/10 rounded-md">
            <h2 class="text-lg font-bold mb-2">Welcome to AI Lawyer!</h2>
            <p>I can help you with legal questions in two ways:</p>
            <ul class="list-disc ml-5 mt-2">
              <li>Ask me general legal questions</li>
              <li>Select documents for me to analyze and provide specific insights</li>
            </ul>
            <p class="mt-2">How can I assist you today?</p>
          </div>
        `,
        timestamp: new Date(),
        conversation_id: conversationId || 'pending'
      };
      
      addMessage(welcomeMessage);
    }
  }, [messages.length, conversationId, addMessage]);
  
  return {
    messages,
    loading,
    inputMessage,
    setInputMessage,
    sendMessage,
    addMessage,
    createUserMessage,
    createAIMessage,
    createSystemMessage,
    handleQuickActionResult,
    clearMessages,
    addWelcomeMessage
  };
} 