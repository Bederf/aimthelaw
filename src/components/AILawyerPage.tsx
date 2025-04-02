import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDocument, SupabaseDocument } from '../services/documentService';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/api';
import { api } from '@/lib/api';
import type { Document as AIDocument } from '@/types/ai';
import { AIQueryRequest, AIResponse } from '@/types/api-types';
import { supabase } from '@/integrations/supabase/client';
import { ModernAIService } from '@/services/modernAIService';

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost: number;
}

interface TotalTokenUsage {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: number;
}

interface ExtendedAIResponse extends AIResponse {
  cost?: number;
}

// Add interface for chat messages
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Add a function to safely render HTML content
const renderMessageContent = (content: string) => {
  // Check if content seems to contain HTML
  if (content.includes('<') && content.includes('>')) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }
  
  // Otherwise render as plain text with line breaks preserved
  return content.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < content.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

// Add some CSS for the loading animation
const thinkingAnimation = `
  <style>
    @keyframes pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }
    .loading-placeholder {
      display: inline-block;
      animation: pulse 1.5s infinite;
      font-style: italic;
      color: #666;
    }
  </style>
`;

const AILawyerPage = ({ clientId }: { clientId: string }) => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documentErrors, setDocumentErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  // Add message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Add input state
  const [inputMessage, setInputMessage] = useState('');
  // Add reference to the input element
  const inputRef = useRef<HTMLInputElement>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    total_cost: 0
  });
  const [totalUsage, setTotalUsage] = useState<TotalTokenUsage>({
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    total_cost: 0
  });
  // Reference to the form element to reset it properly
  const formRef = useRef<HTMLFormElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleDocumentSelect = async (documentId: string) => {
    try {
      const doc = await getDocument(documentId);
      if (!doc) {
        setDocumentErrors(prev => ({
          ...prev,
          [documentId]: "Document not found or inaccessible"
        }));
        return;
      }

      // Safely access processing_status from metadata
      const processingStatus = doc.metadata?.processing_status || doc.status;
      if (!processingStatus || processingStatus !== 'processed') {
        setDocumentErrors(prev => ({
          ...prev,
          [documentId]: `Document is not ready for processing (status: ${processingStatus || 'unknown'}). Please try again later.`
        }));
        return;
      }

      setSelectedDocuments(prev => [...prev, documentId]);
      setDocumentErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[documentId];
        return newErrors;
      });
    } catch (error) {
      console.error('Error selecting document:', error);
      setDocumentErrors(prev => ({
        ...prev,
        [documentId]: "Error accessing document, but you can still chat"
      }));
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Add user message to the chat
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: message,
        isUser: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Add loading placeholder immediately after user message
      const loadingPlaceholderId = `loading-${Date.now()}`;
      const loadingMessage: ChatMessage = {
        id: loadingPlaceholderId,
        content: selectedDocuments.length > 0 
          ? `${thinkingAnimation}<span class="loading-placeholder">Analyzing documents and thinking...</span>`
          : `${thinkingAnimation}<span class="loading-placeholder">AI is thinking...</span>`,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      setTimeout(scrollToBottom, 100);
      
      if (selectedDocuments.length > 0) {
        const validDocuments = await Promise.all(
          selectedDocuments.map(async (docId) => {
            const doc = await getDocument(docId);
            if (!doc) {
              setSelectedDocuments(prev => prev.filter(id => id !== docId));
              setDocumentErrors(prev => ({
                ...prev,
                [docId]: "Document not found or inaccessible"
              }));
              return null;
            }
            return docId;
          })
        );

        const filteredDocuments = validDocuments.filter((doc): doc is string => doc !== null);
        
        const response = await sendMessage(message, filteredDocuments);
        
        // Remove loading placeholder and add AI response
        setMessages(prev => prev.filter(msg => msg.id !== loadingPlaceholderId).concat({
          id: `ai-${Date.now()}`,
          content: response.response || "I couldn't process your request.",
          isUser: false,
          timestamp: new Date()
        }));
        
        if (response.token_usage) {
          setTokenUsage(prev => ({
            prompt_tokens: prev.prompt_tokens + response.token_usage.prompt_tokens,
            completion_tokens: prev.completion_tokens + response.token_usage.completion_tokens,
            total_tokens: prev.total_tokens + response.token_usage.total_tokens,
            total_cost: prev.total_cost + (response.cost || 0)
          }));
        }
      } else {
        const response = await sendMessage(message, []);
        
        // Remove loading placeholder and add AI response
        setMessages(prev => prev.filter(msg => msg.id !== loadingPlaceholderId).concat({
          id: `ai-${Date.now()}`,
          content: response.response || "I couldn't process your request.",
          isUser: false,
          timestamp: new Date()
        }));
        
        if (response.token_usage) {
          setTokenUsage(prev => ({
            prompt_tokens: prev.prompt_tokens + response.token_usage.prompt_tokens,
            completion_tokens: prev.completion_tokens + response.token_usage.completion_tokens,
            total_tokens: prev.total_tokens + response.token_usage.total_tokens,
            total_cost: prev.total_cost + (response.cost || 0)
          }));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message. Please try again.');
      
      // Remove any loading placeholders
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('loading-')));
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: "Sorry, there was an error processing your request. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clear input after sending
      setInputMessage('');
      // Manually reset the form
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  };

  const safeAnalysis = (data: any) => {
    if (!data) return { analysis: "No analysis available", success: false };
    
    return {
      ...data,
      analysis: data.analysis || data.response || "No analysis available",
      success: data.success ?? true
    };
  };

  const handleQuickAction = async (action: string, documentId: string, event?: React.MouseEvent | React.SyntheticEvent) => {
    // This is critical for preventing page refreshes - stop the event immediately
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!documentId) {
      toast.error('Please select a document to analyze');
      return;
    }

    setIsLoading(true);

    try {
      // Add loading message for quick action
      const loadingPlaceholderId = `loading-action-${Date.now()}`;
      const loadingMessage: ChatMessage = {
        id: loadingPlaceholderId,
        content: `${thinkingAnimation}<span class="loading-placeholder">Processing ${action} for document ${documentId}...</span>`,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      setTimeout(scrollToBottom, 100);
      
      const aiService = new ModernAIService(clientId);
      const result = await aiService.handleQuickAction(action, [documentId]);
      
      // Remove loading placeholder
      setMessages(prev => prev.filter(msg => msg.id !== loadingPlaceholderId));
      
      // Check if TTS summary is available and generate audio
      let ttsEnabled = false;
      if (result && (result.tts_summary || result.summary)) {
        try {
          // Import TTS helpers dynamically to avoid circular dependencies
          const { summarizeForTTS } = await import('@/utils/ttsHelpers');
          
          // Get the summary text
          const summaryText = result.tts_summary || result.summary || summarizeForTTS(result.response || result.content, 800);
          
          console.log("TTS summary available for quick action result:", {
            summaryLength: summaryText.length,
            hasTtsSummary: !!result.tts_summary,
            hasSummary: !!result.summary
          });
          
          // Enable TTS flag to indicate we have processed TTS
          ttsEnabled = true;
          
          // Set session storage to enable TTS in the UI
          sessionStorage.setItem('LAST_TTS_CONTENT', summaryText);
          sessionStorage.setItem('ENABLE_TTS_FOR_LAST_MESSAGE', 'true');
        } catch (ttsError) {
          console.error("Error processing TTS for quick action:", ttsError);
        }
      }
      
      // Handle the result with simple toast notifications
      if (result) {
        toast.success(`${action} completed successfully`);
        
        // Add system message to chat about the action
        const actionMessage: ChatMessage = {
          id: `action-${Date.now()}`,
          content: result.response || result.content || `${action} completed successfully for document ${documentId}.`,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, actionMessage]);
        
        // Add a TTS notice if TTS is enabled
        if (ttsEnabled) {
          setTimeout(() => {
            const ttsMessage: ChatMessage = {
              id: `tts-notice-${Date.now()}`,
              content: `<div style="background-color: #f0f7ff; padding: 8px 12px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 8px;">
                <p><strong>Text-to-Speech available</strong></p>
                <p>An audio summary has been generated for this result. Check your browser's audio controls.</p>
              </div>`,
              isUser: false,
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, ttsMessage]);
          }, 500);
        }
      }
    } catch (error) {
      // Remove any loading placeholders
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('loading-action-')));
      
      handleAIError(error as Error, documentId);
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentContent = async (documentId: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/content?client_id=${clientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document content');
      }
      const data = await response.json();
      return data.content || '';
    } catch (error) {
      console.error('Error fetching document content:', error);
      throw error;
    }
  };

  useEffect(() => {
    const cleanupInvalidDocuments = async () => {
      const validDocuments = await Promise.all(
        selectedDocuments.map(async (docId) => {
          const doc = await getDocument(docId);
          return doc ? docId : null;
        })
      );

      const filteredDocuments = validDocuments.filter((doc): doc is string => doc !== null);
      if (filteredDocuments.length !== selectedDocuments.length) {
        setSelectedDocuments(filteredDocuments);
      }
    };

    cleanupInvalidDocuments();
    
    // Add welcome message with usage instructions
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `system-welcome-${Date.now()}`,
        content: `
          <div style="background-color: #f8f9fa; padding: 8px 12px; border-radius: 8px; border-left: 4px solid #4299e1;">
            <p><strong>Welcome to AI Lawyer!</strong></p>
            <p>I can help you with legal questions in two ways:</p>
            <ul style="margin-left: 20px; list-style-type: disc;">
              <li>Ask me general legal questions without selecting documents</li>
              <li>Select specific documents for me to analyze and answer questions about</li>
            </ul>
            <p>How can I assist you today?</p>
          </div>
        `,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const fetchTokenUsage = async () => {
    try {
      const { data: usageData, error } = await supabase
        .from('token_usage')
        .select('prompt_tokens, completion_tokens, total_tokens, cost')
        .eq('client_id', clientId);

      if (error) {
        console.error('Error fetching token usage:', error);
        return;
      }

      const totals = (usageData || []).reduce((acc, curr) => ({
        total_prompt_tokens: acc.total_prompt_tokens + (Number(curr.prompt_tokens) || 0),
        total_completion_tokens: acc.total_completion_tokens + (Number(curr.completion_tokens) || 0),
        total_tokens: acc.total_tokens + (Number(curr.total_tokens) || 0),
        total_cost: acc.total_cost + (Number(curr.cost) || 0)
      }), {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_cost: 0
      });

      setTotalUsage(totals);
    } catch (error) {
      console.error('Error in fetchTokenUsage:', error);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchTokenUsage();
    }
  }, [clientId]);

  const sendMessage = async (message: string, documents: string[]): Promise<ExtendedAIResponse> => {
    // Determine if we should use RAG based on content and context
    // Simple greetings and short messages should be conversational
    const isConversationalMessage = 
      message.length < 10 || 
      /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|great|good|fine)$/i.test(message.trim());
    
    // Only use RAG when there are documents selected OR the message is not conversational
    const shouldUseRag = documents.length > 0 || !isConversationalMessage;
    
    const request: AIQueryRequest = {
      query: message,
      client_id: clientId,
      documents,
      use_rag: shouldUseRag
    };
    
    const response = await api.post('/api/query', request);
    return response;
  };

  const handleAIError = (error: Error, documentId?: string) => {
    console.error('AI operation error:', error);
    
    // Standard error toast - removed reindexing functionality
    toast.error(error.message || 'An error occurred');
  };

  // Improved handleNewChat with better reset functionality
  const handleNewChat = (event?: React.MouseEvent) => {
    // Prevent default if event is provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Clear messages except welcome message
    const welcomeMessage: ChatMessage = {
      id: `system-welcome-${Date.now()}`,
      content: `
        <div style="background-color: #f8f9fa; padding: 8px 12px; border-radius: 8px; border-left: 4px solid #4299e1;">
          <p><strong>Welcome to AI Lawyer!</strong></p>
          <p>I can help you with legal questions in two ways:</p>
          <ul style="margin-left: 20px; list-style-type: disc;">
            <li>Ask me general legal questions without selecting documents</li>
            <li>Select specific documents for me to analyze and answer questions about</li>
          </ul>
          <p>How can I assist you today?</p>
        </div>
      `,
      isUser: false,
      timestamp: new Date()
    };
    
    // Reset messages with just the welcome message
    setMessages([welcomeMessage]);
    
    // Clear input field
    setInputMessage('');
    
    // Clear document errors
    setDocumentErrors({});
    
    // Reset token usage for current session
    setTokenUsage({
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      total_cost: 0
    });
    
    // Reset form state
    if (formRef.current) {
      formRef.current.reset();
    }

    // Focus input for better UX
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Reset session storage values to prevent TTS playback
    sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
    sessionStorage.removeItem('LAST_TTS_CONTENT');
    sessionStorage.removeItem('ENABLE_TTS_FOR_LAST_MESSAGE');
    
    // Show toast notification
    toast.success('Started a new chat');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex flex-wrap justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Selected Documents</h2>
          
          {/* Quick Actions Section - Moved to top area (green section) */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold">Quick Actions:</span>
            <button
              onClick={(e) => selectedDocuments.length > 0 ? handleQuickAction("Extract Dates", selectedDocuments[0], e) : toast.error('Please select a document')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center"
              type="button"
              disabled={selectedDocuments.length === 0}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Extract Dates
              </span>
            </button>
            <button
              onClick={(e) => selectedDocuments.length > 0 ? handleQuickAction("Reply to Letter", selectedDocuments[0], e) : toast.error('Please select a document')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center"
              type="button"
              disabled={selectedDocuments.length === 0}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Reply to Letter
              </span>
            </button>
            <button
              onClick={(e) => selectedDocuments.length > 0 ? handleQuickAction("Summarize Document", selectedDocuments[0], e) : toast.error('Please select a document')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center"
              type="button"
              disabled={selectedDocuments.length === 0}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Summarize
              </span>
            </button>
            <button
              onClick={(e) => selectedDocuments.length > 0 ? handleQuickAction("Prepare for Court", selectedDocuments[0], e) : toast.error('Please select a document')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center"
              type="button"
              disabled={selectedDocuments.length === 0}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Prepare for Court
              </span>
            </button>
          </div>
          
          {/* Model Selection & New Chat (moved to right side - brown section) */}
          <div className="flex items-center space-x-2 ml-auto mt-2 sm:mt-0">
            <span className="text-xs text-gray-500">GPT-4o mini</span>
            <button
              onClick={handleNewChat}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Chat
            </button>
          </div>
        </div>
        
        {/* Document Selection Section */}
        <div className="mt-2">
          {selectedDocuments.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No documents selected. You can still ask general legal questions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedDocuments.map(docId => (
                <div key={docId} className="flex items-center gap-2 bg-gray-100 p-1 rounded text-xs">
                  <span>{docId}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedDocuments(prev => prev.filter(id => id !== docId));
                    }}
                    className="text-red-500 hover:text-red-700"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {Object.entries(documentErrors).map(([docId, error]) => (
            <div key={docId} className="text-red-500 text-xs mt-1">
              {error}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
        {/* Render messages */}
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block p-3 rounded-lg ${
                message.isUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {renderMessageContent(message.content)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Token Usage Info */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs">
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <span className="font-medium text-gray-700">Session:</span>
            <span className="ml-1 text-gray-600">
              {tokenUsage.total_tokens.toLocaleString()} tokens (R{tokenUsage.total_cost.toFixed(2)})
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Total:</span>
            <span className="ml-1 text-gray-600">
              {totalUsage.total_tokens.toLocaleString()} tokens (R{totalUsage.total_cost.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t">
        <form 
          ref={formRef}
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage(inputMessage);
          }}
          method="post"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a legal question..."
            className="flex-1 p-2 border rounded"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSendMessage(inputMessage);
              }
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AILawyerPage; 