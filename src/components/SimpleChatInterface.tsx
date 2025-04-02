import React, { useRef, useEffect } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { Message } from '@/types/ai';
import { MessageSender, MessageRole } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { getAdaptedAIService } from '@/utils/serviceInitializer';

interface SimpleChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

// Simple message component to display individual messages
const SimpleChatMessage: React.FC<SimpleChatMessageProps> = ({ message, isLastMessage }) => {
  const isUser = message.sender === MessageSender.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  
  return (
    <div className={`p-4 rounded-lg mb-4 ${
      isSystem 
        ? 'bg-muted text-muted-foreground text-center mx-auto max-w-full w-full md:max-w-md'
        : isUser
          ? 'bg-primary/10 text-foreground ml-auto max-w-full w-full md:max-w-md'
          : 'bg-secondary/10 text-foreground mr-auto max-w-full w-full md:max-w-md'
    }`}>
      {/* If the content has HTML tags, render it as HTML, otherwise as plain text */}
      {message.content.includes('<') && message.content.includes('>') ? (
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      ) : (
        <div>{message.content}</div>
      )}
      
      {message.timestamp && (
        <div className="text-xs text-muted-foreground mt-2 text-right">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

interface SimpleChatInterfaceProps {
  clientId: string;
  conversationId: string | null;
  initialMessages?: Message[];
  documentIds?: string[];
  modelId?: string;
  onNewMessage?: (message: Message) => void;
}

/**
 * A simplified chat interface component that uses the chatMessageUtils
 * directly for handling message input and output
 */
export const SimpleChatInterface: React.FC<SimpleChatInterfaceProps> = ({
  clientId,
  conversationId,
  initialMessages = [],
  documentIds = [],
  modelId = 'gpt-4o-mini',
  onNewMessage
}) => {
  // Get the AI service
  const aiService = getAdaptedAIService(clientId);
  
  // Use our chat messages hook
  const {
    messages,
    loading,
    inputMessage,
    setInputMessage,
    sendMessage,
    addWelcomeMessage
  } = useChatMessages({
    clientId,
    conversationId,
    aiService,
    initialMessages
  });
  
  // Reference to scroll to the bottom of the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add a welcome message if there are no messages
  useEffect(() => {
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, [messages.length, addWelcomeMessage]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Notify parent component of new messages if callback provided
    if (onNewMessage && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      onNewMessage(latestMessage);
    }
  }, [messages, onNewMessage]);
  
  // Handle message submission
  const handleSubmit = () => {
    sendMessage(inputMessage, documentIds, modelId);
  };
  
  return (
    <div className="flex flex-col h-full w-full border rounded-md overflow-hidden">
      {/* Chat messages area */}
      <ScrollArea className="flex-1 p-2 md:p-4 w-full">
        <div className="space-y-4 w-full">
          {messages.map((message, index) => (
            <SimpleChatMessage
              key={message.id || `msg-${index}`}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center p-2 bg-muted/20 w-full">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}
      
      {/* Input area */}
      <div className="p-2 md:p-4 border-t w-full">
        <div className="flex gap-2 w-full">
          <textarea
            className="flex-1 min-h-[80px] p-3 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={loading}
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !inputMessage.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimpleChatInterface; 