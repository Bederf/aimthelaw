import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  loading: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  loading,
  inputValue,
  onInputChange,
  placeholder = 'Type your message...'
}) => {
  // Use internal state if no controlled value is provided
  const [internalValue, setInternalValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Determine if we're using controlled or uncontrolled input
  const isControlled = inputValue !== undefined;
  const value = isControlled ? inputValue : internalValue;
  
  // Debug log when component renders with props
  useEffect(() => {
    console.log('MessageInput component rendered with:', { 
      isControlled, 
      inputValue, 
      internalValue,
      loading
    });
  }, [isControlled, inputValue, internalValue, loading]);
  
  // Add effect to sync with parent's empty state
  useEffect(() => {
    // If parent sets inputValue to empty string, also clear internal state
    if (isControlled && inputValue === '') {
      setInternalValue('');
      console.log('MessageInput: Parent set empty inputValue, clearing internal state');
    }
  }, [isControlled, inputValue]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('MessageInput: handleChange called with value:', e.target.value);
    if (isControlled) {
      onInputChange?.(e.target.value);
    } else {
      setInternalValue(e.target.value);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('MessageInput: Form submitted with value:', value);
    if (value.trim()) {
      console.log('MessageInput: Value is not empty, calling onSendMessage with:', value);
      const messageToSend = value.trim();
      
      // Clear input field FIRST for both controlled and uncontrolled components
      if (isControlled) {
        // For controlled components, we need to call onChange to update parent state
        onInputChange?.('');
      }
      setInternalValue(''); // Always clear internal state
      
      // Now send the message AFTER clearing the input
      onSendMessage(messageToSend);
      
      // Force focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      console.log('MessageInput: Empty value, not sending message');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log(`MessageInput: Key pressed: ${e.key}, shiftKey: ${e.shiftKey}`);
    
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('MessageInput: Enter key detected without shift');
      if (value.trim()) {
        console.log('MessageInput: Value is not empty, preventing default and sending message');
        e.preventDefault();
        const messageToSend = value.trim();
        
        // Clear input field FIRST for both controlled and uncontrolled components
        if (isControlled) {
          // For controlled components, we need to call onChange to update parent state
          onInputChange?.('');
        }
        setInternalValue(''); // Always clear internal state
        
        // Now send the message AFTER clearing the input
        onSendMessage(messageToSend);
      } else {
        console.log('MessageInput: Empty value on Enter key, not sending message');
      }
    }
  };
  
  // Auto-focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      console.log('MessageInput: Auto-focusing textarea');
      textareaRef.current.focus();
    }
  }, []);
  
  return (
    <form 
      onSubmit={(e) => {
        console.log('MessageInput: Form submit event triggered');
        handleSubmit(e);
      }} 
      className="flex w-full gap-2"
    >
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none h-10 min-h-[40px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={loading}
        rows={1}
      />
      <Button 
        type="submit" 
        disabled={loading || !value.trim()}
        className="h-10 px-4"
        onClick={() => console.log('MessageInput: Send button clicked')}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
};

export default MessageInput; 