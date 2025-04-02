import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageRole, Document, AIModel } from '@/types/ai';
import { toast } from '@/components/ui/use-toast';
import { tokenTrackingService } from '@/services/tokenTrackingService';
import { UnifiedAIService } from '@/services/unifiedAIService';
import { handleError } from '@/utils/errorHandler';

/**
 * Token usage information
 */
export interface TokenInfo {
  totalTokens: number;
  totalCost: number;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * AILawyerState interface
 */
export interface AILawyerState {
  // Conversation state
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  
  // Document state
  selectedFiles: string[];
  clientFiles: Document[];
  trainingFiles: Document[];
  selectedTrainingFiles: string[];
  
  // UI state
  showSidebar: boolean;
  showQuickActions: boolean;
  quickActionLoading: string | null;
  inputMessage: string;
  
  // Model state
  selectedModel: AIModel;
  tokenInfo: TokenInfo;
  
  // Error state
  error: string | null;
  
  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setConversationId: (id: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedFiles: (files: string[]) => void;
  setClientFiles: (files: Document[]) => void;
  setTrainingFiles: (files: Document[]) => void;
  setSelectedTrainingFiles: (files: string[]) => void;
  setShowSidebar: (show: boolean) => void;
  setShowQuickActions: (show: boolean) => void;
  setQuickActionLoading: (action: string | null) => void;
  setInputMessage: (message: string) => void;
  setSelectedModel: (model: AIModel) => void;
  updateTokenInfo: (update: Partial<TokenInfo>) => void;
  resetTokenInfo: () => void;

  // Complex actions
  sendMessage: (message: string, clientId: string) => Promise<void>;
  submitFeedback: (feedback: string, messageId: string) => Promise<void>;
  executeQuickAction: (action: string, clientId: string) => Promise<void>;
  toggleFileSelection: (fileId: string) => void;
  toggleTrainingFileSelection: (fileId: string) => void;
  newConversation: (clientId: string) => Promise<void>;
}

/**
 * AILawyer store using Zustand
 */
const useAILawyerStore = create<AILawyerState>()(
  persist(
    (set, get) => ({
      // Conversation state
      messages: [],
      conversationId: null,
      isLoading: false,
      
      // Document state
      selectedFiles: [],
      clientFiles: [],
      trainingFiles: [],
      selectedTrainingFiles: [],
      
      // UI state
      showSidebar: true,
      showQuickActions: false,
      quickActionLoading: null,
      inputMessage: '',
      
      // Model state
      selectedModel: 'gpt-4-turbo' as AIModel,
      tokenInfo: {
        totalTokens: 0,
        totalCost: 0,
        promptTokens: 0,
        completionTokens: 0
      },
      
      // Error state
      error: null,
      
      // Basic actions
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setConversationId: (id) => set({ conversationId: id }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      setClientFiles: (files) => set({ clientFiles: files }),
      setTrainingFiles: (files) => set({ trainingFiles: files }),
      setSelectedTrainingFiles: (files) => set({ selectedTrainingFiles: files }),
      setShowSidebar: (show) => set({ showSidebar: show }),
      setShowQuickActions: (show) => set({ showQuickActions: show }),
      setQuickActionLoading: (action) => set({ quickActionLoading: action }),
      setInputMessage: (message) => set({ inputMessage: message }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      
      // Token info actions
      updateTokenInfo: (update) => set((state) => ({ 
        tokenInfo: { ...state.tokenInfo, ...update } 
      })),
      
      // Complex actions
      sendMessage: async (message, clientId) => {
        try {
          const state = get();
          if (!message.trim()) return;
          
          // Update UI state
          set({ isLoading: true, error: null });
          
          // Add user message to the conversation
          const userMessage: Message = {
            id: uuidv4(),
            role: MessageRole.USER,
            content: message,
            timestamp: new Date().toISOString(),
          };
          
          set((state) => ({ 
            messages: [...state.messages, userMessage],
            inputMessage: '' 
          }));
          
          // Combine selected files
          const allSelectedFiles = [
            ...state.selectedFiles, 
            ...state.selectedTrainingFiles
          ];
          
          // Create AI service instance
          const aiService = new UnifiedAIService(clientId);
          
          // Send message to API
          const response = await aiService.sendMessage(
            message, 
            allSelectedFiles, 
            state.conversationId,
            state.selectedModel
          );
          
          // Track token usage
          if (response.token_usage) {
            await tokenTrackingService.trackTokenUsage({
              clientId,
              promptTokens: response.token_usage.prompt_tokens || 0,
              completionTokens: response.token_usage.completion_tokens || 0,
              model: state.selectedModel,
              service: 'ai-lawyer-chat'
            });
            
            // Update token info in the store
            const localUsage = tokenTrackingService.getLocalTokenUsage();
            set((state) => ({ 
              tokenInfo: {
                totalTokens: localUsage.total,
                totalCost: localUsage.cost,
                promptTokens: (state.tokenInfo.promptTokens || 0) + (response.token_usage?.prompt_tokens || 0),
                completionTokens: (state.tokenInfo.completionTokens || 0) + (response.token_usage?.completion_tokens || 0)
              }
            }));
          }
          
          // Add AI response to the conversation
          const aiMessage: Message = {
            id: response.message_id || uuidv4(),
            role: MessageRole.ASSISTANT,
            content: response.response || "Sorry, I couldn't generate a response.",
            timestamp: new Date().toISOString(),
          };
          
          set((state) => ({ 
            messages: [...state.messages, aiMessage],
            conversationId: response.conversation_id || state.conversationId
          }));
          
        } catch (error) {
          handleError(error, {
            showToast: true,
            title: "Failed to send message",
            defaultMessage: "There was an error sending your message. Please try again."
          });
          set({ error: error instanceof Error ? error.message : "Unknown error" });
        } finally {
          set({ isLoading: false });
        }
      },
      
      submitFeedback: async (feedback, messageId) => {
        try {
          set({ isLoading: true, error: null });
          
          // Implementation goes here - for now just a toast
          toast({
            title: "Feedback submitted",
            description: "Thank you for your feedback!",
          });
          
          // Add feedback as a message
          const feedbackMessage: Message = {
            id: uuidv4(),
            role: MessageRole.USER,
            content: `Feedback: ${feedback}`,
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'feedback',
              targetMessageId: messageId
            }
          };
          
          set((state) => ({ 
            messages: [...state.messages, feedbackMessage]
          }));
          
        } catch (error) {
          handleError(error, {
            showToast: true,
            title: "Failed to submit feedback",
            defaultMessage: "There was an error submitting your feedback. Please try again."
          });
          set({ error: error instanceof Error ? error.message : "Unknown error" });
        } finally {
          set({ isLoading: false });
        }
      },
      
      executeQuickAction: async (action, clientId) => {
        try {
          const state = get();
          
          // Update UI state
          set({ 
            isLoading: true, 
            quickActionLoading: action,
            error: null 
          });
          
          // Combine selected files
          const allSelectedFiles = [
            ...state.selectedFiles, 
            ...state.selectedTrainingFiles
          ];
          
          // Validate file selection
          if (allSelectedFiles.length === 0) {
            toast({
              title: "No documents selected",
              description: "Please select at least one document to analyze.",
              variant: "destructive"
            });
            return;
          }
          
          // Create AI service instance
          const aiService = new UnifiedAIService(clientId);
          
          // Execute quick action
          const result = await aiService.handleQuickAction(
            action, 
            allSelectedFiles,
            state.selectedModel
          );
          
          // Track token usage if available
          if (result.token_usage) {
            await tokenTrackingService.trackTokenUsage({
              clientId,
              promptTokens: result.token_usage.prompt_tokens || 0,
              completionTokens: result.token_usage.completion_tokens || 0,
              model: state.selectedModel,
              service: `ai-lawyer-${action.toLowerCase().replace(/\s+/g, '-')}`
            });
            
            // Update token info in the store
            const localUsage = tokenTrackingService.getLocalTokenUsage();
            set((state) => ({ 
              tokenInfo: {
                totalTokens: localUsage.total,
                totalCost: localUsage.cost,
                promptTokens: (state.tokenInfo.promptTokens || 0) + (result.token_usage?.prompt_tokens || 0),
                completionTokens: (state.tokenInfo.completionTokens || 0) + (result.token_usage?.completion_tokens || 0)
              }
            }));
          }
          
          // Add system message
          const systemMessage: Message = {
            id: uuidv4(),
            role: MessageRole.SYSTEM,
            content: `Running quick action: ${action}`,
            timestamp: new Date().toISOString(),
          };
          
          // Add AI response
          const aiMessage: Message = {
            id: result.message_id || uuidv4(),
            role: MessageRole.ASSISTANT,
            content: result.response || `Results for ${action}`,
            timestamp: new Date().toISOString(),
            metadata: {
              quickAction: action
            }
          };
          
          set((state) => ({ 
            messages: [...state.messages, systemMessage, aiMessage],
            conversationId: result.conversation_id || state.conversationId
          }));
          
          // Show success toast
          toast({
            title: `${action} completed`,
            description: "Analysis completed successfully.",
          });
          
        } catch (error) {
          handleError(error, {
            showToast: true,
            title: `Failed to execute ${action}`,
            defaultMessage: `There was an error executing ${action}. Please try again.`
          });
          set({ error: error instanceof Error ? error.message : "Unknown error" });
        } finally {
          set({ 
            isLoading: false,
            quickActionLoading: null 
          });
        }
      },
      
      toggleFileSelection: (fileId) => {
        set((state) => {
          const isSelected = state.selectedFiles.includes(fileId);
          return {
            selectedFiles: isSelected
              ? state.selectedFiles.filter((id) => id !== fileId)
              : [...state.selectedFiles, fileId]
          };
        });
      },
      
      toggleTrainingFileSelection: (fileId) => {
        set((state) => {
          const isSelected = state.selectedTrainingFiles.includes(fileId);
          return {
            selectedTrainingFiles: isSelected
              ? state.selectedTrainingFiles.filter((id) => id !== fileId)
              : [...state.selectedTrainingFiles, fileId]
          };
        });
      },
      
      newConversation: async (clientId) => {
        try {
          set({ 
            isLoading: true, 
            error: null,
            messages: [] 
          });
          
          // Create AI service instance
          const aiService = new UnifiedAIService(clientId);
          
          // Create new conversation
          const result = await aiService.createNewConversation();
          
          // Update state with new conversation ID
          set({ 
            conversationId: result.conversation_id,
            messages: []
          });
          
          // Update URL without reloading page
          if (window.history && result.conversation_id) {
            window.history.replaceState(
              {}, 
              '', 
              `/lawyer/ai/${clientId}/${result.conversation_id}`
            );
          }
          
        } catch (error) {
          handleError(error, {
            showToast: true,
            title: "Failed to create new conversation",
            defaultMessage: "There was an error creating a new conversation. Please try again."
          });
          
          // Create local fallback conversation ID
          const localId = uuidv4();
          set({ 
            conversationId: localId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          
          // Update URL without reloading page
          if (window.history) {
            window.history.replaceState(
              {}, 
              '', 
              `/lawyer/ai/${clientId}/${localId}`
            );
          }
          
          toast({
            title: "Using local conversation mode",
            description: "Could not create a server-backed conversation.",
            variant: "destructive"
          });
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'ai-lawyer-store',
      // Only persist selected model and token info to avoid large state issues
      partialize: (state) => ({ 
        selectedModel: state.selectedModel,
        tokenInfo: state.tokenInfo
      }),
    }
  )
);

// Add resetTokenInfo function to the store
useAILawyerStore.setState((state) => ({
  ...state,
  resetTokenInfo: () => {
    console.log('Token reset functionality has been disabled for billing purposes');
    // We don't reset the tokens in the state to maintain accurate billing
    // This implementation is intentionally empty
  }
}));

export default useAILawyerStore; 