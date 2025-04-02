import React, { useRef, useEffect, forwardRef, ForwardedRef, useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, Calendar, FileSearch, FileText, Gavel, List, Brain, Plus, Volume2, ChevronsDown, Paperclip, Copy, AlertTriangle, MessageSquare } from 'lucide-react';
import { Message } from '@/types/ai';
import { AIModel } from '@/hooks/useModelSelection';
import { ModelSelector } from '@/components/ModelSelector';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSender, MessageRole } from '@/types/ai';
import TokenUsageDisplay from '@/components/TokenUsageDisplay';
import useAILawyerStore, { TokenInfo } from '@/stores/aiLawyerStore';
import { getWSLPreference, recordAudioPlaybackError, setWSLPreference, getIframePlaybackPreference, setIframePlaybackPreference } from '@/utils/environment';
import { useToast } from '@/components/ui/use-toast';
import MessageInput from './MessageInput';
import AIMessageComponent from '@/components/AIMessageComponent';
import { ToastAction } from '@/components/ui/toast';

interface Document {
  id: string;
  file_name: string;
  content?: string;
  is_training_doc?: boolean;
  title?: string;
}

export interface ChatInterfaceProps {
  clientName: string;
  clientBusinessId?: string;
  conversations: Array<{ id: string; title: string }>;
  conversationId: string | null;
  clientFiles: Document[];
  trainingFiles: Document[];
  selectedFiles: string[];
  selectedTrainingFiles: string[];
  messages: Message[];
  inputMessage: string;
  loading: boolean;
  quickActionsOpen: boolean;
  quickActionLoading: string | null;
  selectedModel: AIModel;
  tokenInfo: TokenInfo;
  sidebarOpen: boolean;
  showFeedbackForm?: boolean;
  feedbackQuestions?: string[];
  handleConversationSelect: (id: string) => void;
  toggleDocumentSelection: (id: string) => void;
  toggleTrainingFileSelection: (id: string) => void;
  toggleQuickActions: () => void;
  handleQuickAction: (action: string) => void;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleNewChat: () => void;
  setSelectedModel: (model: AIModel) => void;
  handleFeedbackSubmit?: (answers: string[]) => void;
  handleFeedbackCancel?: () => void;
}

const ChatInterface = forwardRef<HTMLDivElement, ChatInterfaceProps>((
  {
    clientName,
    clientBusinessId,
    conversations,
    conversationId,
    clientFiles,
    trainingFiles,
    selectedFiles,
    selectedTrainingFiles,
    messages,
    inputMessage,
    loading,
    quickActionsOpen,
    quickActionLoading,
    selectedModel,
    tokenInfo,
    sidebarOpen,
    showFeedbackForm = false,
    feedbackQuestions = [],
    handleConversationSelect,
    toggleDocumentSelection,
    toggleTrainingFileSelection,
    toggleQuickActions,
    handleQuickAction,
    setInputMessage,
    handleSendMessage,
    handleNewChat,
    setSelectedModel,
    handleFeedbackSubmit,
    handleFeedbackCancel
  },
  ref
) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isWSLEnvironment, setIsWSLEnvironment] = useState<boolean>(getWSLPreference());
  const toast = useToast();

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

  // Add error handler for audio playback
  const handleAudioError = useCallback((error: any) => {
    console.error('ChatInterface audio playback error:', error);
    recordAudioPlaybackError(error);
    setIsWSLEnvironment(true); // Switch to WSL mode if audio fails
    
    // Show toast notification
    toast({
      title: "Audio playback failed",
      description: "Switching to WSL compatibility mode for better audio support.",
      variant: "destructive",
      action: (
        <ToastAction altText="Try again" onClick={toggleWSLMode}>
          Switch back
        </ToastAction>
      ),
    });
  }, [toast]);

  // Toggle WSL mode
  const toggleWSLMode = useCallback(() => {
    const newMode = !isWSLEnvironment;
    setWSLPreference(newMode);
    setIsWSLEnvironment(newMode);
    
    toast({
      title: newMode ? "WSL Mode Enabled" : "WSL Mode Disabled",
      description: newMode 
        ? "Audio will be available for download instead of direct playback." 
        : "Direct audio playback has been enabled.",
    });
  }, [isWSLEnvironment, toast]);

  // Toggle iframe mode
  const toggleIframeMode = useCallback(() => {
    const newMode = !getIframePlaybackPreference();
    setIframePlaybackPreference(newMode);
    toast({
      title: newMode ? "Iframe Mode Enabled" : "Iframe Mode Disabled",
      description: newMode ? "Audio will now play directly in embedded players" : "Audio will be downloaded for playback",
    });
  }, [toast]);

  // Effect to save and restore unsubmitted input message when component unmounts/remounts
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
    <div className="flex flex-col h-full overflow-hidden border rounded-md relative">
      {/* WSL Mode indicator */}
      {isWSLEnvironment && (
        <div className="bg-blue-50 text-blue-800 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Volume2 className="h-4 w-4 mr-2" />
            <span>WSL Audio Mode: {getIframePlaybackPreference() ? 'Using embedded player' : 'Downloads enabled'} for audio playback</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-800 hover:bg-blue-100"
              onClick={toggleIframeMode}
            >
              {getIframePlaybackPreference() ? 'Switch to Download Mode' : 'Use Embedded Player'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-800 hover:bg-blue-100"
              onClick={toggleWSLMode}
            >
              Switch to Direct Playback
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">AI Assistant</h1>
          <div className="text-muted-foreground">
            {clientName && <span>- {clientName}</span>}
            {clientBusinessId && <span className="ml-2 px-2 py-1 bg-primary/10 rounded text-sm font-mono">{clientBusinessId}</span>}
          </div>
          
          {/* Add mode indicator */}
          <div className="ml-4">
            {selectedFiles && selectedFiles.length > 0 ? (
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                <span>Document Analysis Mode</span>
              </div>
            ) : (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded flex items-center">
                <MessageSquare className="h-3 w-3 mr-1" />
                <span>Conversational Mode</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <TokenUsageDisplay 
            clientId={clientBusinessId || "unknown"}
            compact={true}
            showResetButton={false}
          />
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        </div>
      </div>

      {/* Add Quick Action Loading Overlay */}
      {quickActionLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <span className="loading-placeholder bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-md text-primary font-medium">
            Processing {quickActionLoading}...
          </span>
        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar Panel */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className={`${sidebarOpen ? 'block' : 'hidden md:block'}`}
        >
          <div className="h-full border-r bg-card p-4 flex flex-col">
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
              </TabsList>
              <TabsContent value="documents" className="mt-0">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold">Client Documents</h2>
                  </div>
                  
                  <div className="p-2 mb-3 bg-muted/50 rounded text-xs text-muted-foreground">
                    <p className="mb-1">
                      <strong>How to use:</strong>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Select documents by clicking on them</li>
                      <li>Use Quick Actions for document analysis</li>
                      <li>Or ask questions about selected documents</li>
                    </ol>
                  </div>
                  
                  <ScrollArea className="h-[calc(100%-4rem)]">
                    {clientFiles.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No client documents available</div>
                    ) : (
                      clientFiles.map(file => {
                        // Determine if this file is selected by checking if its ID exists in selectedFiles
                        // Handle both string IDs and file objects
                        const isSelected = selectedFiles.some(selected => 
                          typeof selected === 'string' 
                            ? selected === file.id 
                            : selected.id === file.id
                        );
                        
                        return (
                          <div
                            key={file.id}
                            className={`p-2 rounded cursor-pointer hover:bg-accent mb-1 ${
                              isSelected ? 'bg-accent' : ''
                            }`}
                            onClick={() => toggleDocumentSelection(file.id)}
                          >
                            <div className="flex items-center">
                              <FileText className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-sm truncate">{file.file_name}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
              <TabsContent value="conversations" className="mt-0">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold">Conversations</h2>
                  </div>
                  <ScrollArea className="h-40">
                    {conversations.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No conversations yet</div>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.id}
                          className={`p-2 rounded cursor-pointer hover:bg-accent mb-1 ${
                            conversationId === conv.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleConversationSelect(conv.id)}
                        >
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="text-sm truncate">{conv.title || 'Untitled Conversation'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat Panel */}
        <ResizablePanel defaultSize={80}>
          <div className="flex flex-col h-full bg-background">
            {/* Quick Actions Panel - Always visible now */}
            <div className="border-b">
              <Card className="m-4 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Select an action to analyze your documents. Training files are automatically used as background context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => handleQuickAction('Extract Dates')}
                      disabled={loading || quickActionLoading !== null || selectedFiles.length === 0}
                    >
                      {quickActionLoading === 'Extract Dates' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extract Dates
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Extract Dates
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => handleQuickAction('Summarize Document')}
                      disabled={loading || quickActionLoading !== null || selectedFiles.length === 0}
                    >
                      {quickActionLoading === 'Summarize Document' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Summarize Document
                        </>
                      ) : (
                        <>
                          <FileSearch className="h-4 w-4 mr-2" />
                          Summarize Document
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => handleQuickAction('Reply to Letter')}
                      disabled={loading || quickActionLoading !== null || selectedFiles.length !== 1}
                    >
                      {quickActionLoading === 'Reply to Letter' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Reply to Letter
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Reply to Letter
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => handleQuickAction('Prepare for Court')}
                      disabled={loading || quickActionLoading !== null || selectedFiles.length === 0}
                    >
                      {quickActionLoading === 'Prepare for Court' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Prepare for Court
                        </>
                      ) : (
                        <>
                          <Gavel className="h-4 w-4 mr-2" />
                          Prepare for Court
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages display */}
            <div 
              ref={ref} 
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="bg-primary/10 p-6 rounded-full mb-4">
                      <Brain className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to AI Assistant</h2>
                    <p className="text-center text-muted-foreground mb-6 max-w-md">
                      <strong>Training files are always available</strong>, but selecting client documents will provide case-specific assistance.
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
                ) :
                  messages.map((message, index) => (
                    <AIMessageComponent
                      key={message.id || `message-${index}`}
                      message={message}
                      isLastMessage={index === messages.length - 1 && message.sender === MessageSender.AI}
                      showTimestamp={true}
                      clientName={clientName}
                      conversationId={conversationId}
                    />
                  ))
                }
                <div ref={messagesEndRef} id="messages-end" />
              </div>
            </div>

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
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Show feedback form overlay when required */}
      {showFeedbackForm && feedbackQuestions.length > 0 && handleFeedbackSubmit && handleFeedbackCancel && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-card rounded-lg shadow-lg max-w-3xl w-full overflow-hidden border border-border">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Additional Information Needed</h2>
              <p className="text-muted-foreground mb-6">
                Please provide the following information to help me create a tailored response:
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const answers = feedbackQuestions.map((_, i) => 
                  formData.get(`question-${i}`) as string || ''
                );
                handleFeedbackSubmit(answers);
              }}>
                <div className="space-y-4 mb-6">
                  {feedbackQuestions.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <label 
                        htmlFor={`question-${index}`} 
                        className="block font-medium"
                      >
                        {question}
                      </label>
                      <textarea
                        id={`question-${index}`}
                        name={`question-${index}`}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={handleFeedbackCancel}
                    className="px-4 py-2 border rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface; 