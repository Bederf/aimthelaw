import React, { useEffect, useRef, useState } from 'react';
import { Send, Brain, User, MessageSquare, Loader2, FileText, Zap, Info, Scale, X, RefreshCw, Trash2 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AIService } from '@/services/aiService';
import { ModernAIService } from '@/services/modernAIService';
import { loggingService } from '@/services/loggingService';
import type { Message, ExtendedMessage } from "@/types/chat";
import type { Document } from "@/types/ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAIStreamQuery } from '@/hooks/useAIStreamQuery';
import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useDocumentInsights } from '@/hooks/useDocumentInsights';
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/api";
import { AIQueryRequest } from '@/types/api-types';
import { MessageSender } from '@/types/chat';
import { ClientFile } from '@/types/lawyer/client-view';

// Constants for localStorage
const CHAT_STORAGE_KEY = 'ai_chat_messages';
const CHAT_TIMESTAMP_KEY = 'ai_chat_timestamp';
const STORAGE_EXPIRY = 30 * 60 * 1000; // 30 minutes

interface AIChatProps {
  clientId: string;
  documents: ClientFile[];
  selectedDocuments?: string[];
  selectedModel: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSendMessage: (message: string) => Promise<void>;
}

// Add UUID helper function
const generateUniqueId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function AIChat({ 
  clientId, 
  documents,
  selectedDocuments = [],
  selectedModel,
  messages, 
  setMessages, 
  isLoading, 
  setIsLoading,
  onSendMessage
}: AIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Add useEffect to log selected documents
  useEffect(() => {
    if (selectedDocuments.length > 0) {
      console.log(`AIChat: ${selectedDocuments.length} documents selected`, selectedDocuments);
    }
  }, [selectedDocuments]);

  // Update the scroll behavior to be more reliable
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Try smooth scrolling first
      try {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      } catch (e) {
        // Fallback to immediate scroll if smooth scrolling fails
        messagesEndRef.current.scrollIntoView();
      }
    }
  };

  // Improve scroll handling by adding a stronger effect
  useEffect(() => {
    // Immediate scroll
    scrollToBottom();
    
    // Also add a delayed scroll to ensure it happens after any rendering delays
    const delayedScroll = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(delayedScroll);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      // Log that we're sending a message with selected documents
      console.log(`Sending message with ${selectedDocuments.length} selected documents`);
      await onSendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Improve the debug logging in formatMessageContent
  const formatMessageContent = (content: string | any) => {
    // Log the incoming content for debugging
    if (typeof content !== 'string' && content !== null) {
      console.log('Formatting non-string content:', content);
    }

    // If content is null or undefined, return empty string
    if (content == null) {
      return '';
    }
    
    // If content is already a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // Special handling for action result messages
    if (typeof content === 'object') {
      // Check for different types of structured messages
      
      // Date extraction results
      if (content.type === 'date_extraction' && content.content) {
        return content.content;
      }
      
      // Legal summary results
      if (content.type === 'legal_summary' && content.content) {
        return content.content;
      }
      
      // Document analysis results
      if (content.type === 'document_analysis' && content.content) {
        return content.content;
      }
      
      // Court preparation results
      if (content.type === 'court_preparation' && content.content) {
        return content.content;
      }
      
      // Generic action results
      if (content.type && content.content) {
        return content.content;
      }
      
      // Direct object with dates array (fallback for date extraction)
      if (content.dates && Array.isArray(content.dates)) {
        try {
          // Format the date extraction results nicely
          return `Found ${content.dates.length} dates in the document:\n\n${content.dates.map((date: any, index: number) => 
            `${index + 1}. **Date**: ${date.date}\n   **Event**: ${date.event}\n   **Confidence**: ${(date.confidence * 100).toFixed(1)}%\n`
          ).join('\n')}`;
        } catch (e) {
          console.error('Error formatting date extraction results:', e);
        }
      }
      
      // Direct object with message property (fallback for legal summary and other actions)
      if (content.message && typeof content.message === 'string') {
        return content.message;
      }
      
      // Generic object handling - try to convert to nice JSON string
      try {
        // For debugging - log the unhandled object type
        console.log('Unhandled message content object:', content);
        return JSON.stringify(content, null, 2);
      } catch (e) {
        console.warn('Failed to stringify message content:', e);
      }
    }
    
    // Fallback - convert to string
    return String(content);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 p-4 space-y-4 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-180px)]" type="always">
          <div className="space-y-4 pr-4 pb-4">
            {messages.map((message, index) => {
              // Determine message type for styling
              const isUser = message.sender === MessageSender.USER;
              const isSystem = message.sender === MessageSender.SYSTEM;
              const isFileEvent = message.metadata?.type === 'file_selection' || message.metadata?.type === 'file_deselection';
              const isTokenUsage = message.metadata?.type === 'token_usage';
              const isStreaming = message.metadata?.type === 'streaming' && message.metadata.isStreaming;
              
              return (
                <div
                  key={message.id || index}
                  className={`flex ${
                    isUser ? 'justify-end' : 
                    isSystem ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <div
                    className={`${
                      isUser ? 'max-w-[85%] bg-primary text-primary-foreground rounded-lg p-4' : 
                      isSystem ? 'w-full text-xs text-gray-500 py-1 px-2 bg-gray-100 rounded' :
                      isFileEvent ? 'max-w-[85%] bg-blue-100 text-blue-800 rounded-lg p-3' :
                      isTokenUsage ? 'max-w-[85%] bg-gray-100 text-gray-600 rounded-lg p-2 text-xs' :
                      isStreaming ? 'max-w-[85%] bg-muted rounded-lg p-4 border-l-4 border-blue-500' :
                      'max-w-[85%] bg-muted rounded-lg p-4'
                    }`}
                  >
                  {!isSystem && (
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p>{children}</p>
                        }}
                      >
                        {formatMessageContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {isSystem && (
                    <div className="text-center">{message.content}</div>
                  )}
                  
                  {isStreaming && message.content === '' && (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating response...</span>
                    </div>
                  )}
                  
                  {message.metadata?.sources && message.metadata.sources.length > 0 && (
                    <div className="mt-2 text-sm opacity-80">
                      <p className="font-semibold">Sources:</p>
                      <ul className="list-disc pl-4">
                        {message.metadata.sources.map((source: any, idx: number) => (
                          <li key={idx}>{source.content ? source.content.substring(0, 150) + '...' : 'Source data unavailable'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
          </div>
        </ScrollArea>
      </Card>

      <form onSubmit={handleSubmit} className="mt-2">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[60px] max-h-[120px]"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
