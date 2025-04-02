import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PaperPlaneIcon, ReloadIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { ModelSelector } from '@/components/ui/ModelSelector';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '@/lib/api-client';

// Message type definition
interface Message {
  type: 'human' | 'ai' | 'system';
  content: string;
  timestamp?: string;
}

// Feedback question type definition
interface FeedbackQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  required: boolean;
}

// Props for the chat interface
interface ChatInterfaceProps {
  conversationId?: string;
  clientId: string;
  initialMessages?: Message[];
  documents?: string[];
  onReasoningChange?: (reasoning: any) => void;
  className?: string;
}

/**
 * Enhanced chat interface with LangGraph integration
 * 
 * This component provides a chat interface that leverages LangGraph for
 * enhanced reasoning, action routing, and human-in-the-loop feedback.
 */
export function EnhancedChatInterface({
  conversationId: initialConversationId,
  clientId,
  initialMessages = [],
  documents = [],
  onReasoningChange,
  className = ''
}: ChatInterfaceProps) {
  // State for conversation
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [stateId, setStateId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State for model selection
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // State for reasoning display
  const [reasoning, setReasoning] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('chat');
  
  // State for feedback
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([]);
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, any>>({});
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initialize the conversation
  useEffect(() => {
    if (!conversationId && clientId) {
      initializeConversation();
    }
  }, [conversationId, clientId]);
  
  // Initialize a new conversation
  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/langgraph/conversations', {
        system_prompt: "You are a helpful AI legal assistant. You provide accurate, professional answers to legal questions and assist with legal tasks.",
        context: {
          documents: documents.map(docId => ({ id: docId }))
        }
      });
      
      setConversationId(response.data.conversation_id);
      setStateId(response.data.state_id);
      
      // Set initial messages if they were returned
      if (response.data.messages && response.data.messages.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send a message to the chat
  const sendMessage = async () => {
    if (!userInput.trim() || !conversationId) return;
    
    // Add user message to the UI immediately
    const userMessage: Message = {
      type: 'human',
      content: userInput,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    
    try {
      const response = await apiClient.post('/langgraph/messages', {
        user_input: userInput,
        conversation_id: conversationId,
        state_id: stateId
      });
      
      // Add AI response to the UI
      const aiMessage: Message = {
        type: 'ai',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setStateId(response.data.state_id);
      
      // Update reasoning if available
      if (response.data.reasoning) {
        setReasoning(response.data.reasoning);
        if (onReasoningChange) {
          onReasoningChange(response.data.reasoning);
        }
      }
      
      // Create feedback session
      createFeedbackSession(response.data.state_id, response.data.response, response.data.routing);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to the UI
      const errorMessage: Message = {
        type: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a feedback session for the response
  const createFeedbackSession = async (
    stateId: string,
    responseContent: string,
    responseMetadata: any
  ) => {
    try {
      const response = await apiClient.post('/feedback/sessions', {
        conversation_id: conversationId,
        state_id: stateId,
        response_content: responseContent,
        response_metadata: responseMetadata
      });
      
      setFeedbackSessionId(response.data.session_id);
      setFeedbackQuestions(response.data.questions);
      setFeedbackAnswers({});
    } catch (error) {
      console.error('Error creating feedback session:', error);
    }
  };
  
  // Submit feedback
  const submitFeedback = async () => {
    if (!feedbackSessionId) return;
    
    setIsFeedbackSubmitting(true);
    try {
      await apiClient.post(`/feedback/sessions/${feedbackSessionId}/submit`, {
        answers: feedbackAnswers,
        additional_comments: feedbackComment
      });
      
      // Reset feedback state and hide the feedback form
      setFeedbackAnswers({});
      setFeedbackComment('');
      setShowFeedback(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };
  
  // Handle feedback answer changes
  const handleFeedbackChange = (questionId: string, value: any) => {
    setFeedbackAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Format a message for display
  const formatMessage = (message: Message, index: number) => {
    return (
      <div
        key={index}
        className={`flex ${message.type === 'human' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-start max-w-3xl ${message.type === 'human' ? 'flex-row-reverse' : 'flex-row'}`}>
          <Avatar className={`h-8 w-8 ${message.type === 'human' ? 'ml-2' : 'mr-2'}`}>
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground rounded-full">
              {message.type === 'human' ? 'U' : 'AI'}
            </div>
          </Avatar>
          
          <div className={`rounded-lg p-3 ${message.type === 'human' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <ReactMarkdown className="prose dark:prose-invert max-w-none">
              {message.content}
            </ReactMarkdown>
            
            {message.type === 'ai' && feedbackSessionId && (
              <div className="mt-2 text-xs flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeedback(!showFeedback)}
                >
                  {showFeedback ? 'Hide Feedback' : 'Give Feedback'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render the feedback form
  const renderFeedbackForm = () => {
    if (!showFeedback || !feedbackSessionId || feedbackQuestions.length === 0) {
      return null;
    }
    
    return (
      <Card className="mt-4 p-4">
        <CardHeader className="p-2">
          <CardTitle className="text-sm">How was this response?</CardTitle>
          <CardDescription className="text-xs">Your feedback helps improve the AI</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {feedbackQuestions.map(question => (
            <div key={question.id} className="mb-3">
              <p className="text-sm font-medium mb-1">{question.question}</p>
              <div className="flex flex-wrap gap-2">
                {question.options.map(option => (
                  <Button
                    key={option}
                    variant={feedbackAnswers[question.id] === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFeedbackChange(question.id, option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-1">Additional comments</p>
            <Input
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              placeholder="Any additional thoughts?"
            />
          </div>
        </CardContent>
        <CardFooter className="p-2 flex justify-end">
          <Button
            onClick={submitFeedback}
            disabled={isFeedbackSubmitting}
          >
            {isFeedbackSubmitting ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Render the reasoning display
  const renderReasoningDisplay = () => {
    if (!reasoning) {
      return (
        <div className="text-center p-4 text-muted-foreground">
          No reasoning available for this conversation yet.
        </div>
      );
    }
    
    return (
      <div className="p-4">
        {Object.entries(reasoning).map(([key, value]) => (
          <div key={key} className="mb-4">
            <h3 className="text-sm font-bold mb-2 capitalize">{key.replace(/_/g, ' ')}</h3>
            <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
              {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">AI Legal Assistant</h2>
        
        {/* Model selector */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          query={userInput}
          documentCount={documents.length}
          conversationId={conversationId}
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
          <TabsTrigger value="reasoning" className="flex-1">
            Reasoning
            {reasoning && (
              <Badge variant="secondary" className="ml-2">
                Available
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => formatMessage(message, index))}
            {showFeedback && renderFeedbackForm()}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && sendMessage()}
                disabled={isLoading || !conversationId}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !userInput.trim() || !conversationId}
              >
                {isLoading ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperPlaneIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="reasoning" className="flex-1 overflow-y-auto">
          {renderReasoningDisplay()}
        </TabsContent>
      </Tabs>
    </div>
  );
} 