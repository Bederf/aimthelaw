import React, { useRef, useEffect, useCallback } from 'react';
import { useAILawyer } from '../context/AILawyerContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Send, Brain, FileText, Calendar, Loader2 } from 'lucide-react';
import { Message } from '@/types/ai';
import { MessageSender, MessageRole } from '@/types/chat';
import { ModelSelector } from '@/components/ModelSelector';
import TokenUsageDisplay from '@/components/TokenUsageDisplay';
import { AIMessageComponent } from './AIMessageComponent';

// Message input component
const MessageInput = ({ onSendMessage, inputValue, onInputChange, loading, placeholder = "Type your message..." }) => {
  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none min-h-[60px]"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={loading}
        />
      </div>
      <Button 
        onClick={onSendMessage} 
        disabled={loading || !inputValue.trim()}
        size="icon"
        className="h-10 w-10"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
};

// Main ChatInterface component specific to the AI Lawyer feature
export function ChatInterface() {
  const { 
    clientName,
    clientBusinessId,
    clientFiles,
    selectedFiles,
    messages,
    inputMessage,
    loading,
    selectedModel,
    tokenInfo,
    handleSendMessage,
    handleNewChat,
    setInputMessage,
    setSelectedModel
  } = useAILawyer();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Enhanced scroll effect with a slight delay to ensure messages are rendered
  useEffect(() => {
    // Immediate scroll
    scrollToBottom();
    
    // Delayed scroll for when content might take time to render
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Effect to save unsubmitted input message when component unmounts
  useEffect(() => {
    // Retrieve any saved input when the component mounts
    const savedInput = sessionStorage.getItem('UNSENT_INPUT_MESSAGE');
    if (savedInput && savedInput.trim() !== '') {
      setInputMessage(savedInput);
    }
    
    // Save current input when component unmounts
    return () => {
      if (inputMessage && inputMessage.trim() !== '') {
        sessionStorage.setItem('UNSENT_INPUT_MESSAGE', inputMessage);
      }
    };
  }, []);
  
  // Save input message to session storage on change for resilience
  useEffect(() => {
    if (inputMessage && inputMessage.trim() !== '') {
      sessionStorage.setItem('UNSENT_INPUT_MESSAGE', inputMessage);
    }
  }, [inputMessage]);

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-md relative flex-1">
      {/* No header needed here as it's now in the parent component */}
      
      {/* Messages display */}
      <ScrollArea className="flex-1 p-4 h-full overflow-y-auto">
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="bg-primary/10 p-6 rounded-full mb-4">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to AI Assistant</h2>
              <p className="text-center text-muted-foreground mb-6 max-w-md">
                Select client documents for case-specific assistance or ask general legal questions.
              </p>
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Select client documents for case-specific help</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Use quick actions to analyze documents</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Send className="h-4 w-4 mr-2" />
                  <span>Ask questions about legal matters</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <AIMessageComponent
                key={message.id || `message-${index}`}
                message={message}
                isLastMessage={index === messages.length - 1 && message.sender === MessageSender.AI}
                showTimestamp={true}
                clientName={clientName || "Client"}
              />
            ))
          )}
          <div ref={messagesEndRef} id="messages-end" />
        </div>
      </ScrollArea>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-primary/10 px-4 py-2 rounded-full shadow-md flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
          <span className="text-sm font-medium">AI is thinking...</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t bg-card">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            {selectedFiles.length === 0 ? (
              <div className="text-xs text-amber-500 flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                <span>No client documents selected. Using training files only.</span>
              </div>
            ) : (
              <div className="text-xs text-green-500 flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                <span>{selectedFiles.length} client document(s) selected</span>
              </div>
            )}
          </div>
          
          <MessageInput
            onSendMessage={handleSendMessage}
            loading={loading}
            inputValue={inputMessage}
            onInputChange={setInputMessage}
            placeholder="Type your message..."
          />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface; 