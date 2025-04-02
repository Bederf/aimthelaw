/**
 * Simplified Quick Actions Hook
 * 
 * This hook provides a streamlined interface for handling quick actions
 * using the new chat message utilities for better message handling.
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessageManager } from '@/utils/chatMessageUtils';

interface UseSimplifiedQuickActionsOptions {
  clientId: string;
  conversationId: string | null;
  aiService: any;
  getSelectedDocumentIds: () => string[];
  selectedModel: string;
  onMessagesChange: (messages: any[]) => void;
  currentMessages: any[];
}

export function useSimplifiedQuickActions({
  clientId,
  conversationId,
  aiService,
  getSelectedDocumentIds,
  selectedModel,
  onMessagesChange,
  currentMessages
}: UseSimplifiedQuickActionsOptions) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Create a message manager for handling chat messages
  const chatManager = new ChatMessageManager(
    clientId,
    conversationId,
    currentMessages,
    onMessagesChange,
    aiService
  );
  
  // Execute a quick action
  const executeQuickAction = useCallback(async (action: string) => {
    if (actionLoading) {
      toast({
        title: "Action in Progress",
        description: "Please wait for the current action to complete.",
        variant: "destructive"
      });
      return;
    }
    
    // Get selected document IDs
    const documentIds = getSelectedDocumentIds();
    if (documentIds.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document for this action.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Mark as loading
      setActionLoading(action);
      
      // Special handling for single document restrictions
      if (action === 'Reply to Letter' && documentIds.length !== 1) {
        throw new Error('Reply to Letter requires exactly one document');
      }
      
      // Create abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Set flags to prevent HMR issues
      sessionStorage.setItem('QUICK_ACTION_IN_PROGRESS', 'true');
      sessionStorage.setItem('QUICK_ACTION_TYPE', action);
      sessionStorage.setItem('QUICK_ACTION_TIMESTAMP', Date.now().toString());
      sessionStorage.setItem('QUICK_ACTION_SELECTED_DOCS', JSON.stringify(documentIds));
      
      // Execute the action via the AI service
      console.log(`[useSimplifiedQuickActions] Executing ${action} with documents:`, documentIds);
      
      // For Prepare for Court, add a system message indicating the action has started
      if (action === 'Prepare for Court') {
        chatManager.createSystemMessage(`Starting ${action} analysis on ${documentIds.length} document(s)...`);
      }
      
      const result = await aiService.handleQuickAction(action, documentIds, selectedModel);
      
      // Debug log the full result structure to help diagnose issues
      console.log(`[useSimplifiedQuickActions] ${action} API result received:`, JSON.stringify(result, null, 2));
      
      // Store the raw result in session storage for debugging purposes
      try {
        sessionStorage.setItem('LAST_QUICK_ACTION_RESULT', JSON.stringify(result));
        sessionStorage.setItem('LAST_QUICK_ACTION_TYPE', action);
        sessionStorage.setItem('LAST_QUICK_ACTION_TIMESTAMP', Date.now().toString());
      } catch (e) {
        console.warn('Could not save result to session storage:', e);
      }
      
      // Store the result in state
      setLastActionResult(result);
      
      // Special debug handling for Prepare for Court
      if (action === 'Prepare for Court') {
        console.log('[useSimplifiedQuickActions] Prepare for Court result keys:', Object.keys(result));
        
        // Check if result has the expected structure
        const hasCourtPrep = 'court_preparation' in result;
        const hasContent = 'content' in result;
        const hasSummary = 'summary' in result;
        const hasData = 'data' in result && typeof result.data === 'object';
        
        console.log('[useSimplifiedQuickActions] Result structure analysis:', { 
          hasCourtPrep, 
          hasContent, 
          hasSummary, 
          hasData,
          dataKeys: hasData ? Object.keys(result.data) : []
        });
      }
      
      // Handle the result with the chat manager
      const message = chatManager.handleQuickActionResult(action, result, documentIds);
      
      // Show a success toast
      toast({
        title: `${action} Complete`,
        description: `Successfully processed ${documentIds.length} document(s)`,
        duration: 5000
      });
      
      // Return the result and the created message for additional processing if needed
      return { result, message };
    } catch (error) {
      console.error(`[useSimplifiedQuickActions] Error in ${action}:`, error);
      
      // Show an error toast
      toast({
        title: `${action} Failed`,
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
        duration: 10000
      });
      
      // Add error message to chat
      chatManager.createSystemMessage(
        `Error in ${action}: ${error instanceof Error ? error.message : "An unexpected error occurred"}`,
        true
      );
      
      throw error;
    } finally {
      // Clean up
      setActionLoading(null);
      abortControllerRef.current = null;
      
      // Clean up session storage flags with a slight delay to ensure everything is processed
      setTimeout(() => {
        sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
        sessionStorage.removeItem('QUICK_ACTION_TYPE');
        sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
        sessionStorage.removeItem('QUICK_ACTION_SELECTED_DOCS');
      }, 500);
    }
  }, [
    actionLoading,
    getSelectedDocumentIds,
    aiService,
    selectedModel,
    toast,
    chatManager,
    clientId
  ]);
  
  // Cancel the current action
  const cancelAction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      setActionLoading(null);
      
      // Clean up session storage flags
      sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
      sessionStorage.removeItem('QUICK_ACTION_TYPE');
      sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
      
      toast({
        title: "Action Cancelled",
        description: "The quick action was cancelled",
      });
    }
  }, [toast]);
  
  // Get the last executed action result for inspection
  const getLastActionResult = useCallback(() => {
    // First try the state
    if (lastActionResult) {
      return lastActionResult;
    }
    
    // Then try session storage
    try {
      const savedResult = sessionStorage.getItem('LAST_QUICK_ACTION_RESULT');
      if (savedResult) {
        return JSON.parse(savedResult);
      }
    } catch (e) {
      console.warn('Could not parse saved action result:', e);
    }
    
    return null;
  }, [lastActionResult]);
  
  return {
    executeQuickAction,
    cancelAction,
    actionLoading,
    lastActionResult,
    getLastActionResult
  };
} 