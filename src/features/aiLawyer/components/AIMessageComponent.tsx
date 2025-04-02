import React from 'react';
import { Message } from '@/types/ai';
import { MessageSender, MessageRole } from '@/types/chat';
import { Copy, User, Bot, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIMessageComponentProps {
  message: Message;
  isLastMessage?: boolean;
  showTimestamp?: boolean;
  clientName?: string;
}

const AIMessageComponent: React.FC<AIMessageComponentProps> = ({
  message,
  isLastMessage = false,
  showTimestamp = false,
  clientName = 'Client',
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  
  // Skip rendering placeholder messages
  if (message.isPlaceholder) {
    return null;
  }

  // Determine message type
  const isAI = message.sender === MessageSender.AI;
  const isUser = message.sender === MessageSender.USER;
  const isSystem = message.sender === MessageSender.SYSTEM || message.role === MessageRole.SYSTEM;
  const isError = message.error === true;
  
  // Handle copying message content
  const handleCopy = () => {
    // Skip copying if loading
    if (message.isLoading) return;
    
    // Extract plain text content
    let content = '';
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (message.content && typeof message.content === 'object') {
      content = JSON.stringify(message.content, null, 2);
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(content);
    
    // Visual feedback
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Toast notification
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied to your clipboard.",
      duration: 3000,
    });
  };
  
  // Format markdown content
  const formatContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin h-4 w-4 text-primary" />
          <span>AI is thinking...</span>
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="flex items-start space-x-2 text-destructive">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p>{typeof message.content === 'string' ? message.content : 'An error occurred'}</p>
          </div>
        </div>
      );
    }
    
    if (typeof message.content === 'string') {
      return (
        <div className="prose dark:prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    // Fallback for object content
    return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(message.content, null, 2)}</pre>;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isSystem ? 'w-full' : ''}`}>
        <div className={`flex items-start gap-2 group ${isSystem ? 'w-full' : ''}`}>
          {/* Avatar or icon */}
          {!isSystem && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
              ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
          )}
          
          {/* Message content */}
          <div className={`rounded-lg p-3 flex-1 
            ${isUser ? 'bg-primary text-primary-foreground' : ''}
            ${isAI ? 'bg-muted/50 border' : ''}
            ${isSystem ? 'bg-muted/30 border border-muted w-full text-xs' : ''}
            ${isError ? 'bg-destructive/10 border-destructive/20 border' : ''}
          `}>
            {/* Sender name */}
            {showTimestamp && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs opacity-70">
                  {isUser ? clientName : isSystem ? 'System' : 'AI Assistant'}
                </span>
                {message.timestamp && (
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
            
            {/* Message content */}
            {formatContent()}
          </div>
          
          {/* Actions */}
          {!isSystem && !message.isLoading && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only">Copy message</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { AIMessageComponent }; 