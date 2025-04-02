import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Message, Document, TokenInfo } from '@/types/ai';
import { getAdaptedAIService } from '@/utils/serviceInitializer';
import { useDocumentSelection } from '../hooks/useDocumentSelection';
import { useQuickActions } from '../hooks/useQuickActions';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { AIModel, useModelSelection } from '@/hooks/useModelSelection';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { saveConversationComplete, clearChatState } from '@/utils/chatStatePersistence';

// Define the context type
interface AILawyerContextType {
  // Client data
  clientId: string;
  clientName: string | null;
  clientBusinessId: string | null;
  
  // Document selection
  clientFiles: Document[];
  selectedFiles: (string | Document)[];
  toggleDocumentSelection: (id: string) => void;
  getSelectedDocumentIds: () => string[];
  
  // Training files
  trainingFiles: Document[];
  selectedTrainingFiles: (string | Document)[];
  toggleTrainingFileSelection: (id: string) => void;
  
  // Quick actions
  quickActionLoading: string | null;
  handleQuickAction: (action: string, event?: React.MouseEvent) => Promise<void>;
  lastQuickActionResult: any;
  showResultDialog: boolean;
  setShowResultDialog: (show: boolean) => void;
  
  // Messages & conversation
  messages: Message[];
  addMessage: (message: Message) => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  conversationId: string | null;
  conversations: Array<{ id: string; title: string }>;
  
  // UI state
  loading: boolean;
  setLoading: (loading: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Model selection
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  
  // Token info
  tokenInfo: TokenInfo;
  
  // Actions
  handleSendMessage: () => Promise<void>;
  handleNewChat: () => Promise<void>;
  handleConversationSelect: (id: string) => void;
}

// Create the context with displayName for better debugging
const AILawyerContext = createContext<AILawyerContextType | null>(null);
AILawyerContext.displayName = 'AILawyerContext';

// Define Context Provider props
interface AILawyerProviderProps {
  children: React.ReactNode;
  clientId: string;
}

// Provider component
function AILawyerProvider({ 
  children,
  clientId 
}: AILawyerProviderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Get conversation ID from URL params right at the beginning of component
  const params = useParams<{ conversationId?: string }>();
  const { conversationId: urlConversationId } = params;
  
  // Initialize services
  const [aiService] = useState(() => getAdaptedAIService(clientId));
  
  // Client data
  const [clientName, setClientName] = useState<string | null>(null);
  const [clientBusinessId, setClientBusinessId] = useState<string | null>(null);
  
  // Document state
  const [clientFiles, setClientFiles] = useState<Document[]>([]);
  const [trainingFiles, setTrainingFiles] = useState<Document[]>([]);
  const [selectedTrainingFiles, setSelectedTrainingFiles] = useState<(string | Document)[]>([]);
  
  // Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(
    urlConversationId || null
  );
  const [conversations, setConversations] = useState<Array<{ id: string; title: string }>>([]);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  
  // Quick action state
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  
  // Token info
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({ 
    used: 0, 
    cost: 0, 
    totalTokens: 0, 
    totalCost: 0 
  });
  
  // Define addMessage function before it's used
  const addMessage = useCallback((message: Message) => {
    setMessages(prevMessages => {
      // Check if we have a message with the same ID
      const existingMsgIndex = prevMessages.findIndex(m => m.id === message.id);
      if (existingMsgIndex >= 0) {
        // Replace the message
        return [
          ...prevMessages.slice(0, existingMsgIndex),
          message,
          ...prevMessages.slice(existingMsgIndex + 1)
        ];
      } else {
        // Add as a new message
        return [...prevMessages, message];
      }
    });
  }, []);
  
  // Define createNewConversation before it's used
  const createNewConversation = useCallback(async () => {
    try {
      console.log('[AILawyerContext] Creating new conversation');
      const result = await aiService.createNewConversation(clientId);
      const newConversationId = result.conversation_id || result;
      
      console.log(`[AILawyerContext] Created new conversation with ID: ${newConversationId}`);
      setConversationId(newConversationId);
      
      // Store the conversation ID
      if (newConversationId) {
        sessionStorage.setItem(`conversation_${clientId}`, newConversationId);
        localStorage.setItem(`conversation_${clientId}`, newConversationId);
        return newConversationId;
      }
      return null;
    } catch (error) {
      console.error('Error creating new conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation.',
        variant: 'destructive'
      });
      throw error;
    }
  }, [aiService, clientId, toast]);
  
  // Use the document selection hook
  const { 
    selectedFiles, 
    toggleDocumentSelection,
    getSelectedDocumentIds,
    setSelectedFiles
  } = useDocumentSelection({ clientId, clientFiles });
  
  // Use the model selection hook
  const { selectedModel, setSelectedModel } = useModelSelection();
  
  // Use the quick actions hook
  const {
    quickActionLoading: hookQuickActionLoading,
    lastQuickActionResult,
    showResultDialog,
    setShowResultDialog,
    handleQuickAction: quickActionsHandleQuickAction
  } = useQuickActions({
    clientId,
    getSelectedDocumentIds,
    selectedModel,
    conversationId,
    aiService,
    addMessage
  });
  
  // Toggle training file selection
  const toggleTrainingFileSelection = useCallback((id: string) => {
    setSelectedTrainingFiles(prev => {
      const isSelected = prev.some(file => 
        typeof file === 'string' ? file === id : file.id === id
      );
      
      if (isSelected) {
        return prev.filter(file => 
          typeof file === 'string' ? file !== id : file.id !== id
        );
      } else {
        const fileObj = trainingFiles.find(file => file.id === id);
        return [...prev, fileObj || id];
      }
    });
  }, [trainingFiles]);
  
  // Prevent navigation helper - similar to the one in QuickActionsPanel
  const preventNavigation = useCallback((e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e) {
      // Every possible method to prevent navigation/refresh
      e.preventDefault();
      e.stopPropagation();
      if ('stopImmediatePropagation' in e) {
        (e as any).stopImmediatePropagation();
      }
      if ('cancelBubble' in e) {
        (e as any).cancelBubble = true;
      }
      if ('returnValue' in e) {
        (e as any).returnValue = false;
      }
    }
    return false;
  }, []);
  
  // Enhance the handleQuickAction from useQuickActions with additional functionality
  const handleQuickAction = useCallback(async (action: string, e?: React.MouseEvent) => {
    console.log(`[AILawyerContext] Handling quick action: ${action}`);
    
    // Add event prevent default for good measure
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      preventNavigation(e);
    }
    
    // Set the loading state
    setQuickActionLoading(action);
    
    try {
      // Ensure we have a conversation ID before starting
      if (!conversationId) {
        console.log('[AILawyerContext] No conversation ID, creating new conversation before quick action');
        const newConversationId = await createNewConversation();
        console.log(`[AILawyerContext] Created new conversation with ID: ${newConversationId}`);
      }
      
      // Store the selected document IDs in session storage
      const selectedDocuments = getSelectedDocumentIds();
      sessionStorage.setItem('QUICK_ACTION_SELECTED_DOCS', JSON.stringify(selectedDocuments));
      
      // Store conversation ID in session storage to prevent new chat creation
      if (conversationId) {
        sessionStorage.setItem('CURRENT_CONVERSATION_ID', conversationId);
        sessionStorage.setItem('PRESERVE_CONVERSATION_ID', conversationId);
      }
      
      // Set a flag indicating quick action in progress
      sessionStorage.setItem('QUICK_ACTION_IN_PROGRESS', 'true');
      sessionStorage.setItem('QUICK_ACTION_TYPE', action);
      sessionStorage.setItem('QUICK_ACTION_TIMESTAMP', Date.now().toString());
      
      // Add any page-specific preservation
      const currentPath = window.location.pathname;
      if (currentPath) {
        sessionStorage.setItem('PRESERVE_CURRENT_PATH', currentPath);
      }
      
      // Call the useQuickActions handler
      const result = await quickActionsHandleQuickAction(action, e);
      
      // Manually set the result dialog to show
      if (result) {
        console.log(`[AILawyerContext] Quick action completed with result:`, result);
        
        // Ensure showResultDialog is set to true to display the result dialog
        setShowResultDialog(true);
      }
      
      return result;
    } catch (error) {
      console.error(`[AILawyerContext] Error in handleQuickAction:`, error);
      
      // Clean up the flags
      sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
      sessionStorage.removeItem('QUICK_ACTION_TYPE');
      sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
      
      // Show an error toast
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "An error occurred during the action.",
        variant: "destructive"
      });
      
      // Re-throw the error for upstream handling
      throw error;
    } finally {
      // Always reset the loading state
      setQuickActionLoading(null);
    }
  }, [conversationId, getSelectedDocumentIds, quickActionsHandleQuickAction, preventNavigation, createNewConversation, setShowResultDialog, setQuickActionLoading, toast]);
  
  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || loading) return;
    
    try {
      setLoading(true);
      
      // Get all selected document IDs
      const documentIds = getSelectedDocumentIds();
      
      // Find the full document objects for selected files to include as attachments
      const documentAttachments = selectedFiles.map(file => {
        const fileObj = typeof file === 'string' 
          ? clientFiles.find(cf => cf.id === file) 
          : file;
          
        return {
          id: typeof file === 'string' ? file : file.id,
          filename: fileObj?.file_name || fileObj?.title || "Document",
          size: fileObj?.file_size || fileObj?.size || "Unknown size",
          type: fileObj?.file_type || fileObj?.type || "application/pdf"
        };
      });
      
      // Create and add user message immediately with attachments if any
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        sender: 'user',
        content: inputMessage.trim(),
        timestamp: new Date(),
        attachments: documentAttachments.length > 0 ? documentAttachments : undefined
      };
      
      // Add the user message to the conversation
      addMessage(userMessage);
      
      // Clear input after adding the message
      setInputMessage('');
      
      // Create or ensure conversation exists
      if (!conversationId) {
        try {
          const newConversationResponse = await aiService.createNewConversation();
          const newConversationId = newConversationResponse.conversation_id || newConversationResponse;
          setConversationId(newConversationId);
          
          // Store the conversation ID
          if (newConversationId) {
            sessionStorage.setItem(`conversation_${clientId}`, newConversationId);
            localStorage.setItem(`conversation_${clientId}`, newConversationId);
          }
        } catch (error) {
          console.error('Error creating conversation:', error);
          toast({
            title: 'Error',
            description: 'Failed to create a new conversation.',
            variant: 'destructive'
          });
        }
      }
      
      // Add a thinking placeholder message
      const placeholderId = uuidv4();
      const placeholderMessage: Message = {
        id: placeholderId,
        role: 'assistant',
        sender: 'ai',
        content: "Thinking...",
        timestamp: new Date(),
        isPlaceholder: true
      };
      addMessage(placeholderMessage);
      
      // Send message to AI service
      const currentConversationId = conversationId || sessionStorage.getItem(`conversation_${clientId}`);
      
      try {
        // If we have a first message with no documents, provide a friendly greeting
        const isFirstMessage = messages.length === 0;
        
        // Send additional context with the message to make the AI more conversational
        const options = {
          customSystemPrompt: isFirstMessage ? 
            "You are a helpful AI legal assistant. Be conversational and friendly. If the user hasn't selected documents, politely suggest they select relevant documents from the sidebar if they need case-specific help. Always provide actionable next steps, and ask follow-up questions to keep the conversation going." :
            undefined,
          includeDocumentContent: true,
          // Tell the AI which documents are selected to make responses more relevant
          documentContext: documentIds.length > 0 ? 
            `The user has selected ${documentIds.length} document(s) for context.` : 
            "The user hasn't selected any documents yet."
        };
          
        // Send the message using the appropriate service method
        const result = await aiService.sendMessage(
          userMessage.content,
          documentIds,
          selectedModel,
          currentConversationId,
          messages,
          options
        );
        
        console.log("AI response received:", result);
        
        // Remove the placeholder message
        setMessages(prev => prev.filter(m => m.id !== placeholderId));
        
        // Create AI response object
        const aiResponse: Message = {
          id: uuidv4(),
          role: 'assistant',
          sender: 'ai',
          // Handle both string content and structured content with response property
          content: result.message?.response || result.message?.content || result.message || result.response || 
                  "I'm here to help! It seems I didn't receive a proper response from my knowledge system. How can I assist you today?",
          timestamp: new Date(),
          conversation_id: result.conversation_id || currentConversationId || 'pending',
          // Add document references if documents were used
          metadata: {
            ...result.metadata,
            referenced_documents: documentIds.length > 0 ? 
              selectedFiles.map(file => typeof file === 'string' 
                ? { id: file } 
                : { id: file.id, title: file.title, file_name: file.file_name }
              ) : 
              undefined
          }
        };
        
        // Update the conversation ID if it was created during the request
        if (result.conversation_id && !conversationId) {
          setConversationId(result.conversation_id);
          sessionStorage.setItem(`conversation_${clientId}`, result.conversation_id);
        }
        
        // Update token information if available
        if (result.token_usage) {
          setTokenInfo({
            used: result.token_usage.total_tokens || 0,
            cost: result.cost || 0,
            totalTokens: result.token_usage.total_tokens || 0,
            totalCost: result.cost || 0
          });
        }
        
        // Add the actual response as a new message
        addMessage(aiResponse);
      } catch (sendError) {
        console.error('Error sending message to AI service:', sendError);
        
        // Remove the placeholder message
        setMessages(prev => prev.filter(m => m.id !== placeholderId));
        
        // Add error message
        addMessage({
          id: uuidv4(),
          role: 'assistant',
          sender: 'ai',
          content: "I'm sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date(),
          error: true
        });
        
        toast({
          title: 'Error',
          description: 'Failed to process your message. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [inputMessage, loading, addMessage, getSelectedDocumentIds, conversationId, clientId, aiService, toast, selectedModel, messages, selectedFiles, clientFiles, setMessages]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    
    try {
      // Save messages to both localStorage and sessionStorage for redundancy
      const storageKey = `messages_${clientId}_${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
      
      console.log(`Saved ${messages.length} messages to storage for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }, [messages, conversationId, clientId]);
  
  // Consolidated save logic for Supabase persistence with better debouncing
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    
    let saveInterval: NodeJS.Timeout;
    let debounceTimeout: NodeJS.Timeout;
    let saveInProgress = false;
    let pendingSave = false;
    
    // Function to perform the actual save
    const performSave = async (reason: string) => {
      // Skip if a save is already in progress
      if (saveInProgress) {
        pendingSave = true;
        return;
      }
      
      try {
        saveInProgress = true;
        console.log(`${reason} for conversation ${conversationId} to Supabase`);
        
        const success = await saveConversationComplete(clientId, conversationId);
        
        if (success) {
          console.log(`Successfully saved conversation ${conversationId} to Supabase`);
        } else {
          console.warn(`Failed to save conversation ${conversationId} to Supabase`);
        }
      } catch (error) {
        console.error(`Error saving conversation ${conversationId} to Supabase:`, error);
      } finally {
        saveInProgress = false;
        
        // If another save was requested while this one was in progress, do it now
        if (pendingSave) {
          pendingSave = false;
          setTimeout(() => performSave("Executing pending save"), 500);
        }
      }
    };
    
    // Set up periodic saving (every 2 minutes)
    saveInterval = setInterval(() => {
      performSave("Periodic save of conversation");
    }, 2 * 60 * 1000);
    
    // Also save whenever messages change, with debouncing
    debounceTimeout = setTimeout(() => {
      performSave("Saving after messages changed");
    }, 5000);
    
    // Set up beforeunload handler to save when the page is closed
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Set a flag to indicate we're saving on unload
      sessionStorage.setItem('SAVING_ON_UNLOAD', 'true');
      sessionStorage.setItem('SAVE_CONVERSATION_ID', conversationId);
      
      // Try to perform one final save
      try {
        // We can't await this since beforeunload is synchronous
        saveConversationComplete(clientId, conversationId);
      } catch (e) {
        console.error('Error initiating conversation save:', e);
      }
      
      // Show confirmation dialog only if we have unsaved changes
      const unsavedChanges = messages.length > 0;
      if (unsavedChanges) {
        const confirmMessage = 'You have unsaved conversation data. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = confirmMessage;
        return confirmMessage;
      }
    };
    
    // Add the event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up intervals, timeouts, and event listeners
    return () => {
      clearInterval(saveInterval);
      clearTimeout(debounceTimeout);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [conversationId, messages, clientId]);
  
  // Restore messages from localStorage on component mount
  useEffect(() => {
    if (!conversationId) return;
    
    try {
      const storageKey = `messages_${clientId}_${conversationId}`;
      
      // Try to get messages from sessionStorage first, fall back to localStorage
      let savedMessagesStr = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
      
      if (savedMessagesStr) {
        const savedMessages = JSON.parse(savedMessagesStr) as Message[];
        
        // Only restore if we have messages and the current state is empty
        if (savedMessages.length > 0 && messages.length === 0) {
          console.log(`Restoring ${savedMessages.length} messages from storage for conversation ${conversationId}`);
          setMessages(savedMessages);
          
          // Make sure we scroll to the bottom after restoring messages
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scroll-chat-to-bottom'));
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error restoring messages from storage:', error);
    }
  }, [conversationId, clientId, messages.length, setMessages]);
  
  // Handle creating a new chat (modified to clear stored messages)
  const handleNewChat = useCallback(async () => {
    // Check for PREVENT_NEW_CHAT flag very early
    const preventNewChat = 
      sessionStorage.getItem('PREVENT_NEW_CHAT') === 'true' || 
      (window as any).__QUICK_ACTION_IN_PROGRESS === true;
    
    if (preventNewChat) {
      console.log('PREVENT_NEW_CHAT flag detected - preventing new chat creation');
      
      // If a conversation ID is being preserved, restore it
      const preservedId = sessionStorage.getItem('CURRENT_CONVERSATION_ID') || 
                          localStorage.getItem('CURRENT_CONVERSATION_ID');
      
      if (preservedId) {
        console.log(`Restoring preserved conversation ID: ${preservedId}`);
        setConversationId(preservedId);
        
        // Update URL if needed
        if (location.pathname.includes('/ai-new/')) {
          const basePath = location.pathname.split('/').slice(0, 3).join('/');
          navigate(`${basePath}/${clientId}/${preservedId}`);
        }
        
        // Clear the flag after handling it
        setTimeout(() => {
          sessionStorage.removeItem('PREVENT_NEW_CHAT');
        }, 500);
        
        return; // Exit without creating a new chat
      }
    }
    
    // Save the old conversation before creating a new one
    try {
      if (conversationId) {
        console.log(`Saving current conversation ${conversationId} with ${messages.length} messages to Supabase before creating new chat`);
        await saveConversationComplete(clientId, conversationId);
      }
    } catch (e) {
      console.error('Error saving current conversation before creating new chat:', e);
    }
    
    // Clear local storage for the old conversation ID
    if (conversationId) {
      clearChatState(clientId);
    }
    
    // Reset state
    setMessages([]);
    setInputMessage('');
    
    try {
      // Create a new conversation on the server
      const result = await aiService.createNewConversation(clientId);
      if (result && result.conversation_id) {
        console.log(`Created new conversation with ID: ${result.conversation_id}`);
        setConversationId(result.conversation_id);
        
        // Update URL if needed
        if (location.pathname.includes('/ai-new/')) {
          const basePath = location.pathname.split('/').slice(0, 3).join('/');
          navigate(`${basePath}/${clientId}/${result.conversation_id}`);
        }
      } else {
        console.error('Failed to create new conversation, no conversation_id in result:', result);
      }
    } catch (e) {
      console.error('Error creating new conversation:', e);
    }
  }, [aiService, clientId, navigate, conversationId, messages.length]);
  
  // Read the conversation ID from URL params or state
  useEffect(() => {
    // First, check if we have a preserved conversation ID from an interrupted quick action
    const preservedConversationId = sessionStorage.getItem('PRESERVED_CONVERSATION_ID');
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    
    if (quickActionInProgress && preservedConversationId && !urlConversationId) {
      console.log('Restoring conversation ID from quick action:', preservedConversationId);
      setConversationId(preservedConversationId);
      
      // Update URL to include the conversation ID but preserve the client ID
      const currentPath = location.pathname;
      // Extract the base path up to the client ID
      const pathParts = currentPath.split('/');
      if (pathParts.length >= 4) {
        // Preserve the existing path up to /lawyer/ai-new/clientId
        const basePath = pathParts.slice(0, 4).join('/');
        navigate(`${basePath}/${preservedConversationId}`, { replace: true });
      } else {
        // If path structure is unexpected, fallback to safer behavior
        navigate(`/lawyer/ai-new/${clientId}/${preservedConversationId}`, { replace: true });
      }
      
      return;
    }
    
    if (urlConversationId) {
      console.log(`Setting conversation ID from URL: ${urlConversationId}`);
      setConversationId(urlConversationId);
      
      // Store the conversation ID
      sessionStorage.setItem(`conversation_${clientId}`, urlConversationId);
      localStorage.setItem(`conversation_${clientId}`, urlConversationId);
      
      // Also preserve it in case we have a quick action in progress
      sessionStorage.setItem('PRESERVED_CONVERSATION_ID', urlConversationId);
    } else {
      // No conversation ID in URL, try to get from localStorage or create a new one
      const savedConversationId = sessionStorage.getItem(`conversation_${clientId}`) ||
                                  localStorage.getItem(`conversation_${clientId}`);
      
      if (savedConversationId) {
        console.log(`Restoring conversation ID from storage: ${savedConversationId}`);
        setConversationId(savedConversationId);
        
        // IMPORTANT: Update URL to include the conversation ID but PRESERVE the client ID
        // Get the current path which should contain the client ID
        const currentPath = location.pathname;
        // Extract the base path up to the client ID
        const pathParts = currentPath.split('/');
        if (pathParts.length >= 4) {
          // Construct path preserving the existing client ID
          const basePath = pathParts.slice(0, 4).join('/');
          navigate(`${basePath}/${savedConversationId}`, { replace: true });
        } else {
          // Only if the path structure is unexpected, use the provided clientId
          console.log(`Path structure unexpected (${currentPath}), using provided clientId as fallback`);
          navigate(`/lawyer/ai-new/${clientId}/${savedConversationId}`, { replace: true });
        }
      } else {
        // No saved conversation, create a new one
        console.log('No conversation ID found, will create new one when needed');
      }
    }
  }, [clientId, location, navigate, urlConversationId]);
  
  // Handle selecting a conversation
  const handleConversationSelect = useCallback((id: string) => {
    if (id === conversationId) return;
    
    setConversationId(id);
    // Always preserve the current client ID in the path
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    if (pathParts.length >= 4) {
      // Construct path preserving the existing client ID
      const basePath = pathParts.slice(0, 4).join('/');
      navigate(`${basePath}/${id}`, { replace: true });
    } else {
      // Fallback to using provided clientId
      navigate(`/lawyer/ai-new/${clientId}/${id}`, { replace: true });
    }
    
    // Additional logic for loading messages from the selected conversation
    // would be added here
  }, [conversationId, clientId, navigate, location]);
  
  // Force the sidebar open if client files are available
  useEffect(() => {
    if (clientFiles.length > 0 && !sidebarOpen) {
      console.log('Client files found but sidebar closed - opening sidebar');
      setSidebarOpen(true);
    }
  }, [clientFiles, sidebarOpen]);
  
  // Fetch client files and training files on mount
  useEffect(() => {
    const fetchClientFiles = async () => {
      if (!clientId) {
        console.error('[AILawyerContext] No clientId provided, cannot fetch files');
        return;
      }
      
      console.log('[AILawyerContext] Starting fetchClientFiles for clientId:', clientId);
      console.log('[AILawyerContext] Current URL path:', window.location.pathname);
      
      // Extract client ID from the URL to verify we're consistent
      const urlPathParts = window.location.pathname.split('/');
      if (urlPathParts.length >= 4) {
        const urlClientId = urlPathParts[3]; // /lawyer/ai-new/clientId/conversationId
        console.log('[AILawyerContext] Client ID from URL:', urlClientId);
        console.log('[AILawyerContext] Match between URL and context clientId:', urlClientId === clientId);
        
        // If there's a mismatch, log a warning but continue with provided clientId
        if (urlClientId !== clientId) {
          console.warn('[AILawyerContext] Client ID mismatch between URL and context!');
        }
      }
      
      setLoading(true);
      
      // Track success state for both fetch operations
      let hasClientFiles = false;
      let hasTrainingFiles = false;
      
      // Ensure client ID is properly formatted (trimmed, no spaces)
      const formattedClientId = clientId.trim();
      console.log('[AILawyerContext] Using formatted clientId:', formattedClientId);
      
      // Combined approach to find files from all relevant sources
      try {
        // Set up an array to collect files from all sources
        let allClientFiles: any[] = [];
        
        // 1. First try to fetch from client_files table where client_id is TEXT type
        console.log('[AILawyerContext] Fetching client files from client_files table for clientId:', formattedClientId);
        let { data: clientFilesData, error: clientFilesError } = await supabase
          .from('client_files')
          .select('*')
          .eq('client_id', formattedClientId)
          .order('created_at', { ascending: false });
        
        if (clientFilesData && clientFilesData.length > 0) {
          console.log(`[AILawyerContext] Found ${clientFilesData.length} files in client_files table`);
          allClientFiles = [...allClientFiles, ...clientFilesData.map(file => ({
            ...file,
            source: 'client_files'
          }))];
        } else {
          console.log('[AILawyerContext] No files found in client_files table:', clientFilesError?.message || 'No files returned');
          
          // Try an alternative approach if the client_id might be stored differently
          console.log('[AILawyerContext] Trying broader client_files query...');
          const { data: broadClientFiles, error: broadError } = await supabase
            .from('client_files')
            .select('*')
            .limit(20); // Get a sample to inspect
            
          if (broadClientFiles && broadClientFiles.length > 0) {
            console.log('[AILawyerContext] Found some client files, checking for matching client_id');
            console.log('Sample client IDs:', broadClientFiles.map(f => ({ id: f.id, client_id: f.client_id })));
            
            // Check if any of these files match our client ID (with various transformations)
            const matchingFiles = broadClientFiles.filter(file => 
              file.client_id === formattedClientId || 
              file.client_id === formattedClientId.toLowerCase() ||
              file.client_id === formattedClientId.toUpperCase() ||
              file.client_id === formattedClientId.replace(/-/g, '') ||
              (file.metadata && file.metadata.client_id === formattedClientId)
            );
            
            if (matchingFiles.length > 0) {
              console.log(`[AILawyerContext] Found ${matchingFiles.length} matching files`);
              allClientFiles = [...allClientFiles, ...matchingFiles.map(file => ({
                ...file,
                source: 'client_files_broad_match'
              }))];
            }
          }
        }
        
        // 2. Then try to fetch from document_embeddings table where client_id is UUID type
        console.log('[AILawyerContext] Fetching document embeddings for clientId:', formattedClientId);
        // For UUID columns, we need to ensure the UUID is properly formatted
        try {
          const { data: embeddingsData, error: embeddingsError } = await supabase
            .from('document_embeddings')
            .select('*')
            .eq('client_id', formattedClientId)
            .order('created_at', { ascending: false });
          
          if (embeddingsData && embeddingsData.length > 0) {
            console.log(`[AILawyerContext] Found ${embeddingsData.length} documents in embeddings table`);
            
            // Map embedding data to client file format
            const embeddingFiles = embeddingsData.map(embedding => {
              const metadata = embedding.metadata || {};
              return {
                id: embedding.file_id || embedding.id,
                file_name: metadata.file_name || metadata.filename || 'Document from embeddings',
                file_path: metadata.file_path || '',
                file_type: metadata.file_type || metadata.type || 'application/pdf',
                client_id: embedding.client_id || formattedClientId,
                created_at: embedding.created_at || new Date().toISOString(),
                title: metadata.title || metadata.file_name || 'Document from embeddings',
                size: metadata.file_size || metadata.size || 0,
                file_size: metadata.file_size || metadata.size || 0,
                metadata: metadata,
                source: 'document_embeddings'
              };
            });
            
            // Add to our collection, avoiding duplicates by file_id if possible
            const existingIds = new Set(allClientFiles.map(f => f.id));
            const uniqueEmbeddingFiles = embeddingFiles.filter(f => !existingIds.has(f.id));
            
            allClientFiles = [...allClientFiles, ...uniqueEmbeddingFiles];
            console.log(`[AILawyerContext] Added ${uniqueEmbeddingFiles.length} unique files from embeddings`);
          } else if (embeddingsError) {
            // If there's an error with the UUID format, try a raw query approach
            console.log('[AILawyerContext] Error with embeddings query, might be UUID format issue:', embeddingsError.message);
            
            // Try a direct SQL query that explicitly casts the client_id to UUID
            // This requires using the rpc method with a custom stored procedure
            // Or we could try using the REST API directly with proper formatting
            
            // For now, let's try a different approach - query by the file_id if we have some files
            if (allClientFiles.length > 0) {
              const fileIds = allClientFiles.map(file => file.id).filter(Boolean);
              if (fileIds.length > 0) {
                console.log('[AILawyerContext] Trying to find embeddings by file_ids');
                const { data: fileEmbeddings, error: fileEmbError } = await supabase
                  .from('document_embeddings')
                  .select('*')
                  .in('file_id', fileIds);
                  
                if (fileEmbeddings && fileEmbeddings.length > 0) {
                  console.log(`[AILawyerContext] Found ${fileEmbeddings.length} embeddings by file_id`);
                  
                  const embeddingFilesByFileId = fileEmbeddings.map(embedding => {
                    const metadata = embedding.metadata || {};
                    return {
                      id: embedding.file_id || embedding.id,
                      file_name: metadata.file_name || metadata.filename || 'Document from embeddings',
                      file_path: metadata.file_path || '',
                      file_type: metadata.file_type || metadata.type || 'application/pdf',
                      client_id: embedding.client_id || formattedClientId,
                      created_at: embedding.created_at || new Date().toISOString(),
                      title: metadata.title || metadata.file_name || 'Document from embeddings',
                      size: metadata.file_size || metadata.size || 0,
                      file_size: metadata.file_size || metadata.size || 0,
                      metadata: metadata,
                      source: 'document_embeddings_by_file_id'
                    };
                  });
                  
                  const existingIds = new Set(allClientFiles.map(f => f.id));
                  const uniqueFileIdEmbeddings = embeddingFilesByFileId.filter(f => !existingIds.has(f.id));
                  
                  allClientFiles = [...allClientFiles, ...uniqueFileIdEmbeddings];
                  console.log(`[AILawyerContext] Added ${uniqueFileIdEmbeddings.length} unique embeddings by file_id`);
                }
              }
            }
          }
        } catch (embQueryError) {
          console.error('[AILawyerContext] Failed to query document_embeddings:', embQueryError);
        }
        
        // 3. If no files found, create a placeholder
        if (allClientFiles.length === 0) {
          console.log('[AILawyerContext] No files found from any source, creating placeholder');
          
          // Create a placeholder name for display
          setClientName(`Client ${formattedClientId.substring(0, 8)}...`);
          
          // Create a placeholder file
          const placeholderFile = {
            id: `placeholder-${Date.now()}`,
            file_name: 'Welcome Document',
            file_type: 'text/plain',
            client_id: formattedClientId,
            created_at: new Date().toISOString(),
            title: 'Getting Started Guide',
            size: 1024,
            file_size: 1024,
            metadata: {
              content: 'This is a welcome document for your client. You can upload real documents to be analyzed by the AI.'
            },
            source: 'placeholder'
          };
          
          allClientFiles = [placeholderFile];
          console.log('[AILawyerContext] Created placeholder file for client');
        }
        
        // 4. Format and set client files with standardized structure
        if (allClientFiles.length > 0) {
          console.log(`[AILawyerContext] Processing ${allClientFiles.length} client files from all sources`);
          
          // Process to ensure consistent structure
          const processedFiles = allClientFiles.map(file => ({
            id: file.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file_name: file.file_name || file.filename || file.title || 'Unnamed document',
            file_path: file.file_path || '',
            file_type: file.file_type || file.type || 'application/pdf',
            client_id: file.client_id || formattedClientId,
            created_at: file.created_at || new Date().toISOString(),
            title: file.title || file.file_name || file.filename || 'Unnamed document',
            size: file.file_size || file.size || 0,
            file_size: file.file_size || file.size || 0,
            metadata: file.metadata || {},
            type: 'client',
            is_training_doc: false,
            source: file.source || 'unknown'
          }));
          
          setClientFiles(processedFiles);
          hasClientFiles = true;
          console.log(`[AILawyerContext] Successfully set ${processedFiles.length} client files`);
        } else {
          console.warn('[AILawyerContext] No client files found from any source');
          setClientFiles([]);
        }
      } catch (error) {
        console.error('[AILawyerContext] Error fetching client files:', error);
        setClientFiles([]);
      }
      
      // Then try to fetch training files separately
      try {
        console.log('[AILawyerContext] Fetching training files from Supabase');
        // Get training files
        const { data: trainingFilesData, error: trainingFilesError } = await supabase
          .from('training_files')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (trainingFilesError) {
          console.error('[AILawyerContext] Error fetching training files:', trainingFilesError);
        } else if (trainingFilesData) {
          console.log(`[AILawyerContext] Successfully loaded ${trainingFilesData.length} training files`);
          // Map training files to same structure as client files
          const mappedTrainingFiles = trainingFilesData.map(file => ({
            id: file.id || `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: file.title || file.file_name || file.name || 'Unnamed training file',
            file_name: file.file_name || file.name || 'unnamed.txt',
            content: file.content || '',
            created_at: file.created_at || new Date().toISOString(),
            is_training_doc: true
          }));
          setTrainingFiles(mappedTrainingFiles);
          hasTrainingFiles = mappedTrainingFiles.length > 0;
        } else {
          console.log('[AILawyerContext] No training files data returned (undefined)');
        }
      } catch (trainingError) {
        console.error('[AILawyerContext] Exception in training files fetch:', trainingError);
      }
      
      // Show appropriate toast notification based on the fetch results
      if (!hasClientFiles) {
        console.warn('[AILawyerContext] No client files found - showing info toast');
        toast({
          title: 'No Client Documents',
          description: 'No documents found for this client. You can upload documents using the file uploader.',
          variant: 'default'
        });
      }
      
      setLoading(false);
    };
    
    fetchClientFiles();
  }, [clientId, toast]);
  
  // Expose document selection and quick action functions to window for debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      (window as any).toggleDocumentSelection = toggleDocumentSelection;
      (window as any).handleQuickAction = handleQuickAction;
      (window as any).getSelectedDocumentIds = getSelectedDocumentIds;
      
      return () => {
        delete (window as any).toggleDocumentSelection;
        delete (window as any).handleQuickAction;
        delete (window as any).getSelectedDocumentIds;
      };
    }
  }, [toggleDocumentSelection, handleQuickAction, getSelectedDocumentIds]);
  
  // Create memoized context value
  const contextValue = useMemo(() => ({
    // Client data
    clientId,
    clientName,
    clientBusinessId,
    
    // Document selection
    clientFiles,
    selectedFiles,
    toggleDocumentSelection,
    getSelectedDocumentIds,
    
    // Training files
    trainingFiles,
    selectedTrainingFiles,
    toggleTrainingFileSelection,
    
    // Quick actions
    quickActionLoading,
    handleQuickAction,
    lastQuickActionResult,
    showResultDialog,
    setShowResultDialog,
    
    // Messages & conversation
    messages,
    addMessage,
    inputMessage,
    setInputMessage,
    conversationId,
    conversations,
    
    // UI state
    loading,
    setLoading,
    sidebarOpen,
    setSidebarOpen,
    
    // Model selection
    selectedModel,
    setSelectedModel,
    
    // Token info
    tokenInfo,
    
    // Actions
    handleSendMessage,
    handleNewChat,
    handleConversationSelect
  }), [
    clientId, clientName, clientBusinessId,
    clientFiles, selectedFiles, toggleDocumentSelection, getSelectedDocumentIds,
    trainingFiles, selectedTrainingFiles, toggleTrainingFileSelection,
    quickActionLoading, handleQuickAction, lastQuickActionResult, showResultDialog, setShowResultDialog,
    messages, addMessage, inputMessage, setInputMessage, conversationId, conversations,
    loading, setLoading, sidebarOpen, setSidebarOpen,
    selectedModel, setSelectedModel,
    tokenInfo,
    handleSendMessage, handleNewChat, handleConversationSelect
  ]);
  
  // Restore messages from backup after a page refresh during quick action
  const restoreMessagesFromBackup = useCallback(() => {
    // Check if we're recovering from a quick action refresh
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    const preservedConversationId = localStorage.getItem('LAST_PRESERVED_CONVERSATION_ID');
    const backupTimestamp = localStorage.getItem('QUICK_ACTION_MESSAGE_BACKUP_TIMESTAMP');
    
    // Only attempt restoration if we have a conversation ID that matches the current one
    if (preservedConversationId && preservedConversationId === conversationId) {
      console.log(`Attempting to restore messages for conversation ${conversationId} after possible refresh`);
      
      // Check for backup messages in localStorage
      const backupKey = `PRE_ACTION_MESSAGES_${conversationId}`;
      const backupMessages = localStorage.getItem(backupKey);
      
      if (backupMessages) {
        try {
          const parsedMessages = JSON.parse(backupMessages);
          
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            console.log(`Found ${parsedMessages.length} backup messages for conversation ${conversationId}`);
            
            // Check if we already have these messages to avoid duplication
            const currentMessages = messages.filter(m => m.conversation_id === conversationId);
            
            if (currentMessages.length < parsedMessages.length) {
              console.log(`Restoring ${parsedMessages.length} messages from backup (current count: ${currentMessages.length})`);
              
              // Set the messages
              setMessages(prevMessages => {
                // Remove any existing messages for this conversation
                const otherMessages = prevMessages.filter(m => m.conversation_id !== conversationId);
                // Add the restored messages and sort by timestamp
                return [...otherMessages, ...parsedMessages].sort((a, b) => {
                  const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
                  const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
                  return aTime.getTime() - bTime.getTime();
                });
              });
              
              // Clear the backup after successful restoration
              localStorage.removeItem(backupKey);
              sessionStorage.removeItem(backupKey);
              
              return true;
            } else {
              console.log(`No restoration needed, we already have ${currentMessages.length} messages`);
            }
          }
        } catch (error) {
          console.error('Error parsing backup messages:', error);
        }
      }
    }
    
    return false;
  }, [conversationId, messages, setMessages]);
  
  // Check for restoration on component mount and whenever conversation ID changes
  useEffect(() => {
    if (conversationId) {
      // Small delay to ensure other state is initialized
      setTimeout(() => {
        restoreMessagesFromBackup();
      }, 500);
    }
  }, [conversationId, restoreMessagesFromBackup]);
  
  return (
    <AILawyerContext.Provider value={contextValue}>
      {children}
    </AILawyerContext.Provider>
  );
}

// Custom hook for using the context
function useAILawyer() {
  const context = useContext(AILawyerContext);
  
  // Check if we're in an actual AI Lawyer page context
  const isAILawyerPage = window.location.pathname.includes('/lawyer/ai') || 
                         window.location.pathname.includes('/lawyer/ai-new');
  
  if (!context) {
    // If we're on an AI Lawyer page, throw the error since the context should be available
    if (isAILawyerPage) {
      throw new Error('useAILawyer must be used within an AILawyerProvider');
    }
    
    // If we're not on an AI Lawyer page but the hook is being used,
    // return a minimal mock implementation to prevent errors
    return {
      clientId: '',
      clientName: null,
      clientBusinessId: null,
      clientFiles: [],
      selectedFiles: [],
      toggleDocumentSelection: () => {},
      getSelectedDocumentIds: () => [],
      trainingFiles: [],
      selectedTrainingFiles: [],
      toggleTrainingFileSelection: () => {},
      quickActionLoading: null,
      handleQuickAction: async () => {},
      lastQuickActionResult: null,
      showResultDialog: false,
      setShowResultDialog: () => {},
      messages: [],
      addMessage: () => {},
      inputMessage: '',
      setInputMessage: () => {},
      conversationId: null,
      conversations: [],
      loading: false,
      setLoading: () => {},
      sidebarOpen: false,
      setSidebarOpen: () => {},
      selectedModel: { id: 'gpt-4', name: 'GPT-4', description: 'Default model' },
      setSelectedModel: () => {},
      tokenInfo: { used: 0, cost: 0, totalTokens: 0, totalCost: 0 },
      handleSendMessage: async () => {},
      handleNewChat: async () => {},
      handleConversationSelect: () => {}
    } as AILawyerContextType;
  }
  
  return context;
}

// Export the context, provider and hook (this pattern is compatible with Fast Refresh)
export { AILawyerContext, AILawyerProvider, useAILawyer }; 