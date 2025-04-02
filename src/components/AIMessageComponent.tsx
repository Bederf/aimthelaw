import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, MessageSquare, User, Bot, Volume2, Check, AlertTriangle, Loader2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Message } from '@/types/ai';
import { MessageRole, MessageSender } from '@/types/chat';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/api/apiClient';
import { SimpleAudioPlayer } from './SimpleAudioPlayer';
import { summarizeForTTS, handleTTSError, retryTTS } from '@/utils/ttsHelpers';
import { getWSLPreference, getIframePlaybackPreference } from '@/utils/environment';

interface AIMessageComponentProps {
  message: Message;
  isLastMessage?: boolean;
  showTimestamp?: boolean;
  clientName?: string;
  conversationId?: string | null;
  onCopy?: (content: string) => void;
}

export const AIMessageComponent: React.FC<AIMessageComponentProps> = ({
  message,
  isLastMessage = false,
  showTimestamp = false,
  clientName,
  conversationId = null,
  onCopy
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [isWSLEnvironment] = useState<boolean>(getWSLPreference());
  const audioInitializedRef = useRef<boolean>(false);
  // Check if we're in quick action mode
  const [isQuickAction, setIsQuickAction] = useState<boolean>(false);
  
  const isAI = message.sender === MessageSender.AI;
  const isUser = message.sender === MessageSender.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  const isPlaceholder = message.isPlaceholder === true;
  
  // Check if we're currently in a quick action
  useEffect(() => {
    // Check sessionStorage for quick action status
    const quickActionStatus = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS');
    const quickActionType = sessionStorage.getItem('QUICK_ACTION_TYPE');
    const timestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP');
    
    // Parse timestamp if it exists
    const actionTimestamp = timestamp ? parseInt(timestamp, 10) : 0;
    // Consider quick actions active for 5 minutes after they were initiated
    const isRecent = actionTimestamp && (Date.now() - actionTimestamp < 5 * 60 * 1000);
    
    // Check if message metadata indicates this is from a quick action
    const isActionMessage = message.metadata?.source === 'quick_action' || 
                           message.metadata?.action_type || 
                           message.metadata?.is_quick_action;
    
    // Set quick action state based on all available information
    const isActive = (quickActionStatus === 'true' && isRecent) || isActionMessage;
    
    setIsQuickAction(isActive);
    
    // Log for debugging
    if (isActive) {
      console.log(`Message ${message.id} identified as quick action result:`, {
        fromSessionStorage: quickActionStatus === 'true',
        actionType: quickActionType || 'unknown',
        fromMetadata: isActionMessage,
        timestamp: new Date(actionTimestamp).toLocaleString()
      });
    }
  }, [message.id, message.metadata]);
  
  // Function to generate TTS for the message
  const generateAudio = useCallback(async () => {
    if (!message.content || typeof message.content !== 'string' || isLoadingAudio) return;
    
    // Skip if we already have audio for this message
    if (audioSource) {
      console.log(`Already have audio for message ${message.id}, skipping generation`);
      return;
    }
    
    // Check again for cached audio in session storage (redundancy check)
    const storedAudio = sessionStorage.getItem(`TTS_AUDIO_${message.id}`);
    if (storedAudio) {
      console.log(`Found cached audio for message ${message.id} during generation`);
      setAudioSource(storedAudio);
      return;
    }
    
    try {
      setIsLoadingAudio(true);
      setTtsError(null);
      
      // Create a summarized version of the content for TTS
      const ttsContent = summarizeForTTS(message.content);
      
      // Log the TTS request
      console.log(`Generating TTS for message ${message.id} (${ttsContent.length} chars)`);
      
      // Special handling for WSL environment
      if (isWSLEnvironment) {
        try {
          // If iframe mode is enabled, use streaming URL
          if (getIframePlaybackPreference()) {
            // Not implemented in SimpleAudioPlayer yet - fallback to normal mode
            console.log("Using standard TTS for WSL in iframe mode");
          } else {
            // Otherwise use the streaming API with download approach
            console.log("Using streaming TTS API with download for WSL");
            
            // Show download recommendation
            toast({
              title: "WSL Environment Detected",
              description: "Audio will be available for download. For direct playback, try disabling WSL mode in settings.",
            });
          }
        } catch (streamingError) {
          console.error("WSL streaming TTS failed:", streamingError);
          throw streamingError;
        }
      }
      
      // Call the API to convert text to speech
      const response = await api.textToSpeech(ttsContent, {
        voice: 'nova',
        model: 'tts-1',
        format: 'mp3'
      });
      
      if (!response.success || !response.audio_base64) {
        throw new Error(response.error || 'Failed to generate audio');
      }
      
      // Store the audio data in session storage
      const audioData = `data:audio/mp3;base64,${response.audio_base64}`;
      sessionStorage.setItem(`TTS_AUDIO_${message.id}`, audioData);
      sessionStorage.setItem('LAST_TTS_MESSAGE_ID', message.id);
      
      // Set the audio source for the player
      setAudioSource(audioData);
      
      // For WSL environment, trigger a download if configured
      if (isWSLEnvironment && !getIframePlaybackPreference()) {
        const downloadLink = document.createElement('a');
        downloadLink.href = audioData;
        downloadLink.download = `audio-${message.id.substring(0, 8)}.mp3`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        toast({
          title: "Audio Ready for Download",
          description: "The audio file has been prepared for download.",
        });
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setTtsError(error instanceof Error ? error.message : 'Unknown error');
      
      // Call the error handler
      handleTTSError(error, message.id);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [message.content, message.id, isLoadingAudio, isWSLEnvironment, toast]);
  
  // Try to load TTS content for the last AI message, but ONLY if it's a quick action result
  useEffect(() => {
    // Only load audio for AI messages, non-placeholders, and the last message
    // AND only if it's from a quick action
    if (isAI && !isPlaceholder && isLastMessage && message.content && isQuickAction) {
      console.log(`Checking audio for quick action message ${message.id}`);
      
      // Skip if already initialized for this message
      if (audioInitializedRef.current) {
        return;
      }
      
      // Check for existing audio in session storage
      const storedAudio = sessionStorage.getItem(`TTS_AUDIO_${message.id}`);
      if (storedAudio) {
        console.log(`Found cached audio for quick action message ${message.id}`);
        setAudioSource(storedAudio);
        audioInitializedRef.current = true;
        return;
      }
      
      // Generate new TTS for this message
      console.log(`Generating audio for quick action message ${message.id}`);
      generateAudio();
      audioInitializedRef.current = true;
    } else if (isAI && !isQuickAction && isLastMessage) {
      console.log(`Skipping TTS for non-quick action message ${message.id}`);
    }
  }, [isAI, isPlaceholder, isLastMessage, message.id, message.content, generateAudio, isQuickAction]);
  
  // Function to handle copying the message content
  const handleCopy = () => {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Call onCopy handler if provided
    if (onCopy) {
      onCopy(content);
    }
    
    toast({
      title: "Copied to clipboard",
      description: "The message content has been copied to your clipboard.",
    });
  };
  
  // Handle errors in audio playback
  const handleAudioError = useCallback((error: string) => {
    setTtsError(error);
    handleTTSError(error, message.id, audioSource || undefined);
  }, [message.id, audioSource]);
  
  // Format the message content as needed
  const formatContent = () => {
    if (!message.content) return '';
    
    if (typeof message.content === 'string') {
      // If it's a placeholder with "Thinking...", show a loading indicator
      if (isPlaceholder && message.content.includes('Thinking')) {
        return (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        );
      }
      
      // For HTML content that should be rendered as-is
      if (message.content.startsWith('<div') || message.content.startsWith('<p')) {
        return <div dangerouslySetInnerHTML={{ __html: message.content }} />;
      }
      
      // For regular markdown content
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          >
            {message.content}
          </ReactMarkdown>
          
          {/* Show document attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <div 
                  key={`attachment-${idx}`}
                  className="flex items-center p-2 border rounded-md bg-muted/20"
                >
                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm truncate">{attachment.filename || "Document"}</div>
                    {attachment.size && (
                      <div className="text-xs text-muted-foreground">
                        {typeof attachment.size === 'number' 
                          ? `${(attachment.size / 1024).toFixed(2)}KB` 
                          : attachment.size}
                      </div>
                    )}
                  </div>
                  {attachment.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => window.open(attachment.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Show referenced documents if message references documents but doesn't have attachments */}
          {!message.attachments && message.metadata?.referenced_documents?.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Referenced Documents:</div>
              {message.metadata.referenced_documents.map((docRef, idx) => (
                <div 
                  key={`docref-${idx}`}
                  className="flex items-center p-2 border rounded-md bg-muted/20"
                >
                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm truncate">
                      {docRef.title || docRef.file_name || docRef.id || "Document"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // For non-string content, stringify it
    return JSON.stringify(message.content, null, 2);
  };
  
  return (
    <div 
      ref={messageRef}
      className={`flex items-start gap-4 p-4 ${
        isSystem ? 'justify-center' : 
        isUser ? 'justify-end' : 
        'justify-start'
      }`}
    >
      {/* Avatar for AI or User */}
      {!isSystem && (
        <div className={`flex-shrink-0 ${isUser ? 'order-last' : 'order-first'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isAI ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
          }`}>
            {isAI ? <Bot size={16} /> : <User size={16} />}
          </div>
        </div>
      )}
      
      {/* Message content */}
      <div className={`relative ${
        isSystem 
          ? 'w-full max-w-2xl bg-muted p-3 rounded-md text-muted-foreground text-sm' 
          : isUser
            ? 'bg-secondary/10 text-foreground border border-secondary/20 p-4 rounded-lg max-w-3xl'
            : 'bg-primary/10 text-foreground border border-primary/20 p-4 rounded-lg max-w-3xl'
      }`}>
        {/* Content */}
        <div className="mb-2">
          {formatContent()}
        </div>
        
        {/* Footer with controls */}
        {!isSystem && (
          <div className="flex items-center justify-end gap-2 mt-2 text-muted-foreground">
            {/* Audio player for AI messages - only show for quick actions */}
            {isAI && !isPlaceholder && isQuickAction && (
              <div className="flex items-center gap-1">
                {isLoadingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : ttsError ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 p-1 h-8 w-8 rounded-full"
                          onClick={() => retryTTS(message.id, audioSource || undefined)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Audio playback error: Click to retry</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : audioSource ? (
                  <>
                    <SimpleAudioPlayer 
                      audioSource={audioSource}
                      messageId={message.id}
                      onPlaybackError={handleAudioError}
                    />
                    
                    {/* Add download button for WSL environment */}
                    {isWSLEnvironment && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8 w-8 rounded-full"
                              onClick={() => {
                                // Create and click an invisible download link
                                const link = document.createElement('a');
                                link.href = audioSource;
                                link.download = `audio-${message.id.substring(0, 8)}.mp3`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download audio</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button" 
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 rounded-full"
                          onClick={generateAudio}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate audio</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            
            {/* Copy button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 rounded-full"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Timestamp */}
            {showTimestamp && message.timestamp && (
              <span className="text-xs">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMessageComponent;
