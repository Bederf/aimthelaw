import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from '@/components/ui/alert';
import { Info, MessageSquare, Zap, Send, X, RefreshCw, Trash2, Scale, FileText, Calendar, CalendarCheck } from 'lucide-react';
import type { Document } from "@/types/ai";
import type { Message, ExtendedMessage } from "@/types/chat";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAIStreamQuery } from '@/hooks/useAIStreamQuery';
import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
import { AIQueryRequest } from '@/types/api-types';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { ModernAIService } from '@/services/modernAIService';
import { api } from '@/api/apiClient';
import { DateExtractionRequest } from '@/types/api-types';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { MessageRole, MessageSender } from '@/types/chat';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RealTimeAITabProps {
  clientId: string;
  selectedDocuments: string[];
  documentsAvailable: boolean;
  selectedModel?: string;
  documents?: Document[];
  messages: ExtendedMessage[];
  setMessages: (messages: ExtendedMessage[] | ((prev: ExtendedMessage[]) => ExtendedMessage[])) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

/**
 * Super AI Chat component for the AILawyerPage
 * Combines all features of standard chat and real-time streaming in a single unified interface
 */
export function RealTimeAITab({ 
  clientId, 
  selectedDocuments, 
  documentsAvailable,
  selectedModel = 'gpt-4',
  documents = [],
  messages,
  setMessages,
  isLoading,
  setIsLoading
}: RealTimeAITabProps) {
  // Remove internal message state since we're using parent state
  // const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  // Remove internal loading state since we're using parent state
  // const [isLoading, setIsLoading] = useState(false);

  // New state for calendar dialog
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [extractedDates, setExtractedDates] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiService = useRef<ModernAIService | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Real-time streaming hooks
  const {
    streamingContent,
    isStreaming,
    isDone,
    tokenUsage,
    error,
    startStreaming,
    cancelStreaming,
    reset: resetStreaming
  } = useAIStreamQuery();
  
  // Query suggestions hooks
  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    updateQuery,
    selectSuggestion,
    clearSuggestions
  } = useQuerySuggestions(clientId);

  // Initialize AI service and welcome message
  useEffect(() => {
    if (clientId) {
      aiService.current = new ModernAIService(clientId);
    }

    // Add welcome message if no messages exist
    if (messages.length === 0) {
      const welcomeMessage: ExtendedMessage = {
        id: 'welcome',
        role: 'assistant',
        sender: 'ai',
        content: `👋 Welcome to your AI Legal Assistant!

I'm here to help you analyze legal documents and provide insights based on what you share with me.

**To get the most helpful analysis:**

1. **Select documents** from your file list using the panel on the left
2. Once documents are selected, you can:
   - Ask specific questions about those documents
   - Use the quick action buttons for common tasks (summarize, extract dates, etc.)
   - Get detailed analysis based on the selected content

**Without documents selected**, I can only provide general information and guidance on legal concepts.

How can I assist you today?`,
        timestamp: new Date(),
        metadata: {
          type: 'welcome'
        }
      };
      setMessages([welcomeMessage]);
    }
  }, [clientId, setMessages]);

  // Handle document selection changes
  useEffect(() => {
    if (selectedDocuments.length > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'system' || !lastMessage.content.includes('document')) {
        const systemMessage: ExtendedMessage = {
          id: `docs-${Date.now()}`,
          role: 'assistant',
          sender: 'ai',
          content: `📄 **Document${selectedDocuments.length > 1 ? 's' : ''} Selected**: ${documents.filter(d => selectedDocuments.includes(d.id)).map(d => d.file_name).join(', ')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    }
  }, [selectedDocuments, documents]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Update suggestions as user types
  useEffect(() => {
    if (inputValue.length > 2) {
      updateQuery(inputValue);
    } else {
      clearSuggestions();
    }
  }, [inputValue]);

  // Find the useEffect that monitors streaming state and update it
  useEffect(() => {
    if (isDone && streamingContent) {
      console.log('Streaming complete, adding message with content:', streamingContent);
      
      // Create message from streaming content
      const aiResponseMessage: ExtendedMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        sender: 'ai',
        content: streamingContent,
        timestamp: new Date(),
        metadata: {
          token_usage: tokenUsage,
          sources: sources,
          streaming: true
        }
      };
      
      // Update messages state with the final AI response
      setMessages(prev => [...prev, aiResponseMessage]);
      
      // Reset streaming state
      setIsTyping(false);
      setActiveAction(null);
      resetStreaming();
    }
  }, [isDone, streamingContent, tokenUsage, sources, setMessages, resetStreaming]);

  // Add effect to log document selection changes
  useEffect(() => {
    console.log('Document selection changed:', {
      selectedDocuments,
      documentsAvailable,
      documentCount: documents?.length || 0
    });
  }, [selectedDocuments, documentsAvailable, documents]);

  // Handle quick actions
  const handleQuickAction = async (action: string) => {
    if (isLoading || isStreaming) return;
    
    if (selectedDocuments.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to analyze",
        variant: "destructive"
      });
      return;
    }
    
    // Enhanced logging for document selection in quick actions
    console.log('QUICK ACTION DOCUMENT SELECTION:', {
      action,
      selectedDocuments,
      selectedDocumentsCount: selectedDocuments.length,
      documentNames: documents
        .filter(d => selectedDocuments.includes(d.id))
        .map(d => d.file_name)
    });
    
    setActiveAction(action);
    setIsTyping(true);
    setIsLoading(true);
    
    try {
      // Add user action message with document references
      const actionMessage: ExtendedMessage = {
        id: Date.now().toString(),
        role: 'user',
        sender: 'user',
        content: `Analyze the selected documents and provide insights about: ${action}`,
        timestamp: new Date(),
        metadata: {
          type: 'action',
          action,
          selected_documents: selectedDocuments,
          document_count: selectedDocuments.length,
          document_names: documents
            .filter(d => selectedDocuments.includes(d.id))
            .map(d => d.file_name)
        }
      };
      
      setMessages(prev => [...prev, actionMessage]);
      
      // Add improved system message with document details
      const systemMessage: ExtendedMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        sender: 'ai',
        content: `🔍 **Starting ${action}**\n\nAnalyzing ${selectedDocuments.length} document(s):\n${documents
          .filter(d => selectedDocuments.includes(d.id))
          .map(d => d.file_name)
          .join('\n')}`,
        timestamp: new Date(),
        metadata: {
          type: 'action_start',
          action,
          selected_documents: selectedDocuments
        }
      };
      
      setMessages(prev => [...prev, systemMessage]);

      // Convert action name to endpoint format
      const actionLower = action.toLowerCase().replace(/\s+/g, '_');
      
      let response;
      
      // Create the base request data with enhanced document references
      const baseRequestData = {
        client_id: clientId,
        documents: selectedDocuments,
        model: selectedModel,
        // Add system prompt to ensure document analysis
        system_prompt: `CRITICAL INSTRUCTION: You are analyzing ${selectedDocuments.length} specific document(s): ${documents
          .filter(d => selectedDocuments.includes(d.id))
          .map(d => d.file_name)
          .join(', ')}. 
ONLY use content from these documents for your analysis.
Reference specific documents by name when providing insights.
The specific document IDs being analyzed are: ${selectedDocuments.join(', ')}.`
      };
      
      // Log API request for debugging
      console.log(`Sending ${actionLower} request with document references:`, JSON.stringify({
        client_id: baseRequestData.client_id,
        documents: baseRequestData.documents,
        model: baseRequestData.model,
        has_system_prompt: !!baseRequestData.system_prompt,
        documentNames: documents
          .filter(d => selectedDocuments.includes(d.id))
          .map(d => d.file_name)
      }));
      
      // Call the appropriate endpoint based on the action
      switch (actionLower) {
        case 'extract_dates':
          try {
            // Show loading message
            const loadingMessage: ExtendedMessage = {
              id: uuidv4(),
              content: "📅 Analyzing documents and extracting dates...",
              role: MessageRole.SYSTEM,
              sender: MessageSender.SYSTEM,
              timestamp: new Date(),
              metadata: {
                type: 'loading',
                actionType: action,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev, loadingMessage]);

            // First get document embeddings and content for each selected document
            let allDocumentContent = "";
            const failedDocuments = [];
            
            for (const docId of selectedDocuments) {
              try {
                // Get document chunks from embeddings
                const { data: embeddingsData, error: embeddingsError } = await supabase
                  .from('document_embeddings')
                  .select('content, metadata')
                  .eq('file_id', docId)
                  .eq('client_id', clientId)
                  .order('metadata->>chunk_index');

                if (embeddingsError) {
                  throw new Error(`Failed to fetch document embeddings: ${embeddingsError.message}`);
                }

                if (!embeddingsData || embeddingsData.length === 0) {
                  // Check document status
                  const { data: fileData, error: fileError } = await supabase
                    .from('client_files')
                    .select('status, file_name')
                    .eq('id', docId)
                    .single();

                  if (fileError) {
                    throw new Error(`Document ${docId} not found in client_files`);
                  }

                  if (fileData) {
                    throw new Error(`Document ${fileData.file_name} (${docId}) exists but has no embeddings. Status: ${fileData.status}`);
                  } else {
                    throw new Error(`No document embeddings found for document ${docId}. Please ensure the document has been processed.`);
                  }
                }

                // Combine all chunks in order
                const documentContent = embeddingsData
                  .sort((a, b) => {
                    const aIndex = a.metadata?.chunk_index ? parseInt(a.metadata.chunk_index) : 0;
                    const bIndex = b.metadata?.chunk_index ? parseInt(b.metadata.chunk_index) : 0;
                    return aIndex - bIndex;
                  })
                  .map(chunk => chunk.content?.trim())
                  .filter(Boolean)
                  .join('\n\n');

                // Add document identifier before content
                const doc = documents.find(d => d.id === docId);
                allDocumentContent += `\n\n## Document: ${doc?.file_name || docId}\n${documentContent}`;
              } catch (error) {
                console.error(`Error fetching content for document ${docId}:`, error);
                failedDocuments.push({
                  id: docId,
                  name: documents.find(d => d.id === docId)?.file_name || docId,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }

            if (!allDocumentContent && failedDocuments.length === selectedDocuments.length) {
              throw new Error("Could not process any of the selected documents. Please check document status and try again.");
            }

            if (!allDocumentContent || allDocumentContent.trim().length === 0) {
              throw new Error("No document content available for date extraction");
            }

            // Clean document IDs to ensure they're valid strings
            const validDocumentIds = selectedDocuments.filter(id => 
              typeof id === 'string' && id.trim().length > 0
            );
            
            if (validDocumentIds.length === 0) {
              throw new Error("No valid document IDs available for date extraction");
            }

            // Ensure content isn't just whitespace or very minimal
            if (allDocumentContent.trim().length < 10) {
              throw new Error("Document content is too short or empty for date extraction");
            }

            // Log content size for debugging
            console.log(`Document content prepared for date extraction: ${allDocumentContent.length} characters, with ${validDocumentIds.length} valid document IDs`);
            
            // Create API request body with both content and documents to ensure at least one is valid
            const requestBody = {
              client_id: clientId,
              documents: validDocumentIds,
              content: allDocumentContent,
              model: selectedModel,
              skip_training_data: true
            };
            
            console.log("Date extraction request body:", {
              ...requestBody,
              content: `${requestBody.content.substring(0, 100)}... (${requestBody.content.length} chars)`
            });
            
            // Call the date extraction endpoint
            const datesResponse = await axios.post(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/extract_dates`, 
              requestBody, 
              {
                // Add timeout and better error handling
                timeout: 30000,
                validateStatus: (status) => status < 500 // Only throw for server errors
              }
            ).then(res => {
              if (res.status !== 200) {
                console.error(`Date extraction returned status ${res.status}:`, res.data);
                
                // Enhanced error handling for validation errors (422)
                if (res.status === 422 && res.data) {
                  let errorDetail = '';
                  // Handle different validation error formats
                  if (res.data.detail && Array.isArray(res.data.detail)) {
                    // Format array of validation errors
                    errorDetail = res.data.detail.map((err: any) => 
                      `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg || JSON.stringify(err)}`
                    ).join('; ');
                  } else if (res.data.detail) {
                    // String or object detail
                    errorDetail = typeof res.data.detail === 'string' 
                      ? res.data.detail 
                      : JSON.stringify(res.data.detail);
                  } else {
                    // Fallback to stringifying the entire response
                    errorDetail = JSON.stringify(res.data);
                  }
                  throw new Error(`Date extraction validation error: ${errorDetail}`);
                }
                
                throw new Error(`Date extraction failed: ${res.status} ${res.data?.detail || JSON.stringify(res.data) || 'Unknown error'}`);
              }
              return res.data;
            });
            
            console.log('Date extraction response:', datesResponse);
            
            // Format the dates into a readable message
            let datesContent = '📅 **Date Extraction Results**\n\n';
            
            if (datesResponse.data && datesResponse.data.dates && datesResponse.data.dates.length > 0) {
              // Group dates by document if multiple documents
              const datesByDoc = datesResponse.data.dates.reduce((acc: any, date: any) => {
                const docId = date.document_id || 'unknown';
                if (!acc[docId]) {
                  acc[docId] = [];
                }
                acc[docId].push(date);
                return acc;
              }, {});

              // Add dates for each document
              Object.entries(datesByDoc).forEach(([docId, dates]: [string, any]) => {
                const doc = documents.find(d => d.id === docId);
                if (doc) {
                  datesContent += `\n📄 **Document: ${doc.file_name}**\n`;
                } else {
                  datesContent += `\n📄 **Document ID: ${docId}**\n`;
                }
                
                (dates as any[]).forEach((date: any) => {
                  datesContent += `\n• **Date:** ${date.date}`;
                  if (date.event) {
                    datesContent += `\n  **Event:** ${date.event}`;
                  }
                  if (date.context) {
                    datesContent += `\n  **Context:** ${date.context}`;
                  }
                  datesContent += '\n';
                });
              });

              // Add timeline section if available
              if (datesResponse.data.structured_timeline) {
                datesContent += '\n📅 **Timeline**\n';
                
                // Process the structured timeline
                Object.entries(datesResponse.data.structured_timeline).forEach(([year, months]: [string, any]) => {
                  if (year === 'unknown_dates') {
                    datesContent += `\n**Unknown Dates:**\n`;
                    months.forEach((item: any) => {
                      datesContent += `\n• ${item.date || 'Unknown'}: ${item.event || 'Unknown event'}\n`;
                    });
                  } else {
                    datesContent += `\n**${year}**\n`;
                    
                    Object.entries(months).forEach(([month, events]: [string, any]) => {
                      datesContent += `\n**${month}**\n`;
                      
                      (events as any[]).forEach((event: any) => {
                        datesContent += `\n• ${event.date.split('-')[2] || 'Unknown day'}: ${event.event || 'Unknown event'}\n`;
                      });
                    });
                  }
                });
              }

              datesContent += `\n---\nAnalyzed ${selectedDocuments.length} document(s)`;
              
              // Add failed documents section if any
              if (failedDocuments.length > 0) {
                datesContent += '\n\n⚠️ **Note:** Some documents could not be processed:\n';
                failedDocuments.forEach(doc => {
                  datesContent += `\n• ${doc.name}: ${doc.error}`;
                });
              }

              // Store the extracted dates for potential calendar export
              setExtractedDates(datesResponse.data.dates);
              
              // Show the calendar dialog
              setShowCalendarDialog(true);
            } else {
              datesContent += 'No dates were found in the selected documents.';
              
              // Add failed documents section if any
              if (failedDocuments.length > 0) {
                datesContent += '\n\n⚠️ **Note:** Some documents could not be processed:\n';
                failedDocuments.forEach(doc => {
                  datesContent += `\n• ${doc.name}: ${doc.error}`;
                });
              }
            }

            // Create AI response message
            const datesMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: datesContent,
              timestamp: new Date(),
              metadata: {
                type: 'date_extraction',
                token_usage: datesResponse.data.token_usage,
                dates: datesResponse.data.dates,
                timeline: datesResponse.data.structured_timeline,
                failed_documents: failedDocuments,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };

            // Update messages state with the AI response
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), datesMessage]);
          } catch (error) {
            console.error('Error in date extraction:', error);
            
            // Extract error message with enhanced details
            let errorMessage = 'Unknown error occurred during date extraction';
            let errorTitle = "Date Extraction Failed";
            
            if (error instanceof Error) {
              errorMessage = error.message;
              
              // Customize error title based on error type
              if (errorMessage.includes('validation error')) {
                errorTitle = "Date Extraction Validation Error";
              } else if (errorMessage.includes('timeout')) {
                errorTitle = "Date Extraction Timeout";
              }
            } else if (error instanceof Object) {
              try {
                errorMessage = JSON.stringify(error);
              } catch (e) {
                errorMessage = 'Complex error object, see console for details';
              }
            }
            
            // Show toast notification with improved details
            toast({
              title: errorTitle,
              description: errorMessage,
              variant: "destructive",
              duration: 7000, // Longer duration for detailed error messages
            });
            
            // Add voice notification for the error
            try {
              // Use browser's speech synthesis if available
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(
                  `Date extraction failed. ${error instanceof Error ? error.message : 'Unknown error occurred'}`
                );
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                window.speechSynthesis.speak(utterance);
              } else {
                // Fallback to TTS API if browser speech synthesis isn't available
                const ttsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/tts`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    text: `Date extraction failed. ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                    voice: 'nova',
                    speed: 1.0
                  }),
                });
                
                if (ttsResponse.ok) {
                  const audioBlob = await ttsResponse.blob();
                  const audioUrl = URL.createObjectURL(audioBlob);
                  const audio = new Audio(audioUrl);
                  audio.play();
                }
              }
            } catch (ttsError) {
              console.error('Error generating voice notification:', ttsError);
            }
            
            const errorMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: `Error extracting dates: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
              metadata: {
                type: 'error',
                error_type: 'date_extraction_error',
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorMessage]);
          }
          break;
          
        case 'legal_summary':
        case 'summarize_document':
          try {
            // Show loading message
            const loadingMessage: ExtendedMessage = {
              id: uuidv4(),
              content: "📄 Analyzing documents and generating summary...",
              role: MessageRole.SYSTEM,
              sender: MessageSender.SYSTEM,
              timestamp: new Date(),
              metadata: {
                type: 'loading',
                actionType: action,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev, loadingMessage]);

            // Call the legal summary endpoint
            const summaryResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/legal_summary/`, {
              ...baseRequestData,
              content: await getDocumentContent(selectedDocuments, clientId, documents)
            }).then(res => res.data);
            
            console.log('Legal summary response:', summaryResponse);
            
            const summaryMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: summaryResponse.summary || 'No summary generated.',
              timestamp: new Date(),
              metadata: {
                type: 'legal_summary',
                token_usage: summaryResponse.token_usage,
                structured_summary: summaryResponse.structured_summary,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name),
                failed_documents: summaryResponse.failed_documents || []
              }
            };
            
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), summaryMessage]);
          } catch (error) {
            console.error('Error generating summary:', error);
            const errorMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
              metadata: {
                type: 'error',
                error_type: 'summary_error',
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorMessage]);
          }
          break;
          
        case 'prepare_court':
        case 'court_case_preparation':
          try {
            // Show loading message
            const loadingMessage: ExtendedMessage = {
              id: uuidv4(),
              content: "⚖️ Preparing court case analysis...",
              role: MessageRole.SYSTEM,
              sender: MessageSender.SYSTEM,
              timestamp: new Date(),
              metadata: {
                type: 'loading',
                actionType: action,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev, loadingMessage]);

            // Call the court case preparation endpoint
            const courtResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/court_case_preparation/`, {
              ...baseRequestData,
              content: await getDocumentContent(selectedDocuments, clientId, documents)
            }).then(res => res.data);
            
            console.log('Court preparation response:', courtResponse);
            
            const courtMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: courtResponse.content || courtResponse.strategy || 'No court case strategy generated.',
              timestamp: new Date(),
              metadata: {
                type: 'court_preparation',
                token_usage: courtResponse.token_usage,
                strategy_details: courtResponse.strategy_details,
                is_structured_reasoning: true,
                failed_documents: courtResponse.failed_documents || [],
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), courtMessage]);
          } catch (error) {
            console.error('Error in court case preparation:', error);
            const errorMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: `Error preparing court case: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
              metadata: {
                type: 'error',
                error_type: 'court_preparation_error',
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorMessage]);
          }
          break;
          
        case 'reply_to_letter':
          try {
            // Validate document selection
            if (!selectedDocuments || selectedDocuments.length === 0) {
              throw new Error("Please select a document to analyze");
            }
            
            // Ensure exactly one document is selected for letter reply
            if (selectedDocuments.length > 1) {
              throw new Error("Please select exactly one letter document to reply to");
            }

            // Show loading message
            const loadingMessage: ExtendedMessage = {
              id: uuidv4(),
              content: "📝 Analyzing letter document...",
              role: MessageRole.SYSTEM,
              sender: MessageSender.SYSTEM,
              timestamp: new Date(),
              metadata: {
                type: 'loading',
                actionType: action,
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev, loadingMessage]);

            // Get document content using helper function
            const documentContent = await getDocumentContent(selectedDocuments, clientId, documents);
            
            // Get document name for reference
            const docId = selectedDocuments[0]; // Get first selected document
            const selectedDoc = documents.find(d => d.id === docId);
            const docName = selectedDoc?.file_name || docId;

            // Call the letter reply endpoint
            console.log('Sending letter analysis request:', {
              documentId: docId,
              documentName: docName,
              contentLength: documentContent.length,
              model: selectedModel,
              firstChunk: documentContent.substring(0, 100)
            });

            const letterResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/letters/reply`, {
              client_id: clientId,
              document_id: docId,
              model: selectedModel,
              action: 'analyze',
              content: documentContent,
              document_name: docName
            }).then(res => res.data);
            
            console.log('Letter analysis response:', letterResponse);
            
            // Create AI response message with analysis results
            const letterAnalysisMessage: Message = {
              id: uuidv4(),
              content: `# Letter Analysis\n\n## Summary\n${letterResponse.analysis?.summary || "No summary available"}\n\n## Key Points\n${(letterResponse.analysis?.key_points || ["No key points identified"]).map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}\n\n## Legal Context\n${(letterResponse.analysis?.legal_context || [{ topic: "Note", details: "No specific legal context identified" }]).map((ctx: any) => `- **${ctx.topic || "Point"}**: ${ctx.details || "No details"}`).join('\n')}`,
              role: MessageRole.ASSISTANT,
              sender: MessageSender.AI,
              timestamp: new Date(),
              metadata: {
                type: 'letter_analysis',
                documentId: docId,
                documentName: docName,
                keyPoints: letterResponse.analysis?.key_points || [],
                requiresResponse: true,
                rawResponse: letterResponse
              }
            };
            
            // Replace loading message with analysis
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), letterAnalysisMessage]);
          } catch (error) {
            console.error('Error in letter analysis:', error);
            const errorMessage: ExtendedMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              sender: 'ai',
              content: `Error analyzing letter: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
              metadata: {
                type: 'error',
                error_type: 'letter_analysis_error',
                selectedDocuments: selectedDocuments,
                documentNames: documents
                  .filter(d => selectedDocuments.includes(d.id))
                  .map(d => d.file_name)
              }
            };
            setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorMessage]);
          }
          break;
          
        default:
          // For other actions, use streaming
          const request: AIQueryRequest = {
            query: action,
            client_id: clientId,
            documents: selectedDocuments,
            use_rag: true,
            model: selectedModel
          };
          
          console.log(`Using streaming for action: ${action}`);
          
          // Start streaming - the useEffect will handle adding the AI response message
          // when streaming is complete
          await startStreaming({
            ...request,
            endpoint: actionLower
          });
          
          // No need to manually add a message here, the useEffect will handle it
          break;
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
      const errorMessage: ExtendedMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        sender: 'ai',
        content: `Sorry, there was an error performing the ${action} action. Please try again.`,
        timestamp: new Date(),
        metadata: {
          type: 'error',
          error_type: 'action_error',
          action
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setActiveAction(null);
    }
  };

  // Add debugging in useEffect to check selected documents on component mount and updates
  useEffect(() => {
    console.log('Selected documents in RealTimeAITab:', selectedDocuments);
    console.log('Documents available:', documentsAvailable);
    console.log('Documents array:', documents);
  }, [selectedDocuments, documentsAvailable, documents]);

  // Update the handleSendMessage function to force document usage
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    
    // Enhanced logging for document selection
    console.log('DOCUMENT SELECTION DEBUG:');
    console.log('- Selected documents in RealTimeAITab:', selectedDocuments);
    console.log('- Selected documents count:', selectedDocuments.length);
    console.log('- Documents available:', documentsAvailable);
    
    // Create document names for logging and system prompt
    const documentNames = documents
      .filter(d => selectedDocuments.includes(d.id))
      .map(d => d.file_name);
    
    console.log('- Selected document names:', documentNames);
    
    const userMessage: ExtendedMessage = {
      id: Date.now().toString(),
      role: 'user',
      sender: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      metadata: {
        // Enhanced metadata with explicit document references
        selected_documents: selectedDocuments,
        documents_count: selectedDocuments.length,
        document_names: documentNames
      }
    };
    
    // Add a special system message if documents are selected
    if (selectedDocuments.length > 0) {
      const docInfoMessage: ExtendedMessage = {
        id: Date.now().toString() + '-sys',
        role: 'system',
        sender: 'system',
        content: `Using ${selectedDocuments.length} document(s): ${documentNames.join(', ')}`,
        timestamp: new Date(),
        metadata: {
          type: 'document_reference',
          selected_documents: selectedDocuments
        }
      };
      setMessages(prev => [...prev, docInfoMessage]);
    }
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setIsLoading(true);
    
    try {
      // Create the request with document references and forced RAG
      const request: AIQueryRequest = {
        query: inputValue.trim(),
        client_id: clientId,
        documents: selectedDocuments,
        use_rag: true, // Force RAG to be enabled
        model: selectedModel,
        // Enhanced system prompt to force document analysis
        system_prompt: selectedDocuments.length > 0 
          ? `CRITICAL INSTRUCTION: You are analyzing ${selectedDocuments.length} specific document(s): ${documentNames.join(', ')}. 
You MUST ONLY use content from these documents to answer the query. 
DO NOT fabricate information. Reference the specific documents by name in your answer.
If you cannot find relevant information in the documents, clearly state this.
The specific document IDs being analyzed are: ${selectedDocuments.join(', ')}.`
          : undefined
      };
      
      console.log('Sending AI request with explicit document references:', JSON.stringify({
        query: request.query,
        client_id: request.client_id,
        documents: request.documents,
        use_rag: request.use_rag,
        model: request.model,
        has_system_prompt: !!request.system_prompt
      }));
      
      // Start streaming
      await startStreaming(request);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ExtendedMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        sender: 'ai',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        metadata: {
          type: 'error',
          error_type: 'api_error'
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Handle regenerating response
  const handleRegenerateResponse = async () => {
    if (!lastQuery || isLoading || isStreaming) return;
    
    // Enhanced logging for document selection in regenerate response
    console.log('REGENERATE RESPONSE DOCUMENT SELECTION:');
    console.log('- Last query:', lastQuery);
    console.log('- Selected documents for regeneration:', selectedDocuments);
    console.log('- Selected documents count:', selectedDocuments.length);
    
    // Get document names for display and logging
    const documentNames = documents
      .filter(d => selectedDocuments.includes(d.id))
      .map(d => d.file_name);
    
    console.log('- Selected document names for regeneration:', documentNames);
    
    // Remove the last assistant message
    const filteredMessages = messages.filter(msg => {
      const isLastAssistantMessage = msg.role === 'assistant' && 
        msg.timestamp === messages[messages.length - 1]?.timestamp;
      return !isLastAssistantMessage;
    });
    
    setMessages(filteredMessages);
    setIsTyping(true);
    setIsLoading(true);

    try {
      // Create request with document references and forced RAG
      const request: AIQueryRequest = {
        query: lastQuery,
        client_id: clientId,
        documents: selectedDocuments,
        use_rag: true,
        model: selectedModel,
        // Add system prompt to ensure document analysis if documents are selected
        system_prompt: selectedDocuments.length > 0 
          ? `CRITICAL INSTRUCTION: You are analyzing ${selectedDocuments.length} specific document(s): ${documentNames.join(', ')}. 
You MUST ONLY use content from these documents to answer the query.
DO NOT fabricate information. Reference the specific documents by name in your answer.
If you cannot find relevant information in the documents, clearly state this.
The specific document IDs being analyzed are: ${selectedDocuments.join(', ')}.`
          : undefined
      };

      // Log the regeneration request
      console.log('Regenerating response with explicit document references:', JSON.stringify({
        query: request.query,
        client_id: request.client_id,
        documents: request.documents,
        use_rag: request.use_rag,
        model: request.model,
        has_system_prompt: !!request.system_prompt
      }));

      await startStreaming({
        ...request
      });
    } catch (error) {
      console.error('Error regenerating response:', error);
      const errorMessage: ExtendedMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        sender: 'ai',
        content: 'Sorry, there was an error regenerating the response. Please try again.',
        timestamp: new Date(),
        metadata: {
          type: 'error',
          error_type: 'regeneration_error'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Add a new helper component for rendering structured output from OpenManus
  const StructuredLegalStrategy = ({ content }: { content: string }) => {
    // Identify sections in the content (based on markdown headings)
    const sections = content.split(/(?=## )/g).filter(section => section.trim());
    
    // Organize sections into tabs
    const issueAnalysis = sections.find(s => s.includes('Issue Analysis') || s.includes('Key Issues'));
    const recommendations = sections.find(s => s.includes('Recommendation') || s.includes('Strategic'));
    const nextSteps = sections.find(s => s.includes('Next Steps') || s.includes('Action'));
    const overview = sections.find(s => s.includes('Overview') || s.includes('Summary'));
    
    // If no clearly defined sections, just render the content as is
    if (sections.length <= 1) {
      return (
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }
    
    return (
      <Card className="w-full border-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>Court Case Strategy</CardTitle>
          <CardDescription>
            Generated using OpenManus structured legal reasoning
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Key Issues</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="nextsteps">Next Steps</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{overview || (overview ? '' : content)}</ReactMarkdown>
            </TabsContent>
            
            <TabsContent value="issues" className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{issueAnalysis || 'No specific issue analysis provided.'}</ReactMarkdown>
            </TabsContent>
            
            <TabsContent value="recommendations" className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{recommendations || 'No specific recommendations provided.'}</ReactMarkdown>
            </TabsContent>
            
            <TabsContent value="nextsteps" className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{nextSteps || 'No specific next steps provided.'}</ReactMarkdown>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end pt-4 text-xs text-muted-foreground">
          <span>Prepared using structured multi-step reasoning</span>
        </CardFooter>
      </Card>
    );
  };

  // Add helper function for getting document content
  const getDocumentContent = async (documentIds: string[], clientId: string, documents: Document[]) => {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch each document individually using GET requests
      const documentsPromises = documentIds.map(async (docId) => {
        console.log(`Fetching content for document: ${docId}`);
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/documents/${docId}/content?client_id=${clientId}`, 
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          console.error(`Error fetching document ${docId}:`, response.status, response.statusText);
          return null;
        }

        const data = await response.json();
        return {
          file_id: data.file_id,
          file_name: data.file_name,
          file_type: data.file_type,
          content: data.content,
          is_training_doc: false
        };
      });

      // Wait for all requests to complete
      const results = await Promise.all(documentsPromises);
      
      // Filter out any null results (failed requests)
      const documents = results.filter(doc => doc !== null);
      console.log(`Successfully fetched content for ${documents.length} of ${documentIds.length} documents`);
      
      return documents;
    } catch (error) {
      console.error('Error fetching document content:', error);
      throw error;
    }
  };

  // New function to handle calendar export
  const handleExportToCalendar = async () => {
    if (!extractedDates.length) return;
    
    setIsExporting(true);
    try {
      const response = await api.post('/calendar/events', {
        client_id: clientId,
        events: extractedDates
      });
      
      if (response.data && response.data.success) {
        toast({
          title: "Calendar Export Successful",
          description: `Successfully added ${response.data.events_added} events to calendar`
        });
        
        // Add a system message about the calendar export
        const calendarMessage: ExtendedMessage = {
          id: uuidv4(),
          content: `✅ Successfully added ${response.data.events_added} events to your calendar.`,
          role: MessageRole.SYSTEM,
          sender: MessageSender.SYSTEM,
          timestamp: new Date(),
          metadata: {
            type: 'calendar_export',
            events_added: response.data.events_added
          }
        };
        setMessages(prev => [...prev, calendarMessage]);
      } else {
        toast({
          variant: "destructive",
          title: "Export Failed",
          description: response.data?.message || "Failed to export dates to calendar"
        });
      }
    } catch (error) {
      console.error('Error exporting to calendar:', error);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "An error occurred while exporting dates to calendar"
      });
    } finally {
      setIsExporting(false);
      setShowCalendarDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-6 p-4">
        <Card className="flex flex-col h-[calc(100vh-200px)]">
          <CardContent className="flex-1 flex flex-col h-full pt-6">
            {/* Chat actions */}
            <div className="flex justify-between mb-4">
              <div className="flex gap-2">
                {/* Quick action buttons can go here if needed */}
              </div>
              {/* Remove the Clear Chat button */}
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <>
                          {message.metadata?.is_structured_reasoning ? (
                            <StructuredLegalStrategy content={message.content} />
                          ) : (
                            <div className="prose dark:prose-invert max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          )}
                          {message.metadata?.failed_documents && message.metadata.failed_documents.length > 0 && (
                            <div className="mt-2 text-sm text-orange-500 dark:text-orange-400">
                              <p className="font-semibold">Note: Some documents could not be processed:</p>
                              <ul className="list-disc pl-5">
                                {message.metadata.failed_documents.map((doc: any, idx: number) => (
                                  <li key={idx}>{doc.reason || `Document ${doc.id || idx}`}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      {message.metadata?.token_usage && (
                        <div className="mt-2 text-xs text-right opacity-70">
                          {message.metadata.token_usage.total_tokens} tokens
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming content display */}
                {isStreaming && streamingContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-muted border border-blue-200">
                      <div className="mb-2 text-xs font-medium text-blue-600">
                        {selectedDocuments.length > 0 ? (
                          <>
                            <p>AI is analyzing {selectedDocuments.length} document(s):</p>
                            <ul className="mt-1 ml-2 text-xs list-disc list-inside">
                              {documents
                                .filter(d => selectedDocuments.includes(d.id))
                                .map(d => (
                                  <li key={d.id} className="truncate">{d.file_name}</li>
                                ))
                              }
                            </ul>
                          </>
                        ) : (
                          "AI is responding to your query..."
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{streamingContent}</div>
                    </div>
                  </div>
                )}

                {/* Typing indicator (only show when not streaming) */}
                {isTyping && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '600ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Query suggestions */}
            {suggestions.length > 0 && !isStreaming && !isLoading && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Suggested queries:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setInputValue(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="relative mt-auto">
              <Input
                ref={inputRef}
                placeholder="Type your message or question here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || isStreaming}
                className="pr-20"
              />

              {/* Clear input button */}
              {inputValue && !isLoading && !isStreaming && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-0 h-full"
                  onClick={() => setInputValue('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Send button */}
              <Button
                type="submit"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isStreaming}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dates to Calendar</DialogTitle>
            <DialogDescription>
              {extractedDates.length} dates were found in the documents. Would you like to add these dates to your calendar?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowCalendarDialog(false)}
            >
              No, thanks
            </Button>
            <Button
              onClick={handleExportToCalendar}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4" />
                  Yes, add to calendar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 