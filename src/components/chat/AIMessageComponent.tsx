import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Message } from '@/types/Message';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '@/components/CodeBlock';
import '@/styles/markdown.css';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { ChatMessageActions } from './ChatMessageActions';
import AudioPlayer from '../AudioPlayer';
import { SpeakerLoudIcon, SpeakerModerateIcon } from '@radix-ui/react-icons';

interface AIMessageProps {
  message: Message;
  isLatestMessage?: boolean;
  className?: string;
  enableTTS?: boolean;
}

export const AIMessageComponent: React.FC<AIMessageProps> = ({
  message,
  isLatestMessage = false,
  className,
  enableTTS = true,
}) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioInitialized = useRef(false);
  const messageIdRef = useRef(message.id);

  // Update for message recovery during quick actions
  useEffect(() => {
    // Check for refreshes during quick actions
    const lastMessageId = sessionStorage.getItem('LAST_AI_MESSAGE_ID');
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    
    // Store this message ID in ref for component lifespan
    messageIdRef.current = message.id;
    
    if (isLatestMessage && lastMessageId && lastMessageId === message.id) {
      console.log(`This is the recovered message from a quick action: ${message.id}`);
      sessionStorage.removeItem('LAST_AI_MESSAGE_ID');
    }
  }, [message.id, isLatestMessage]);

  // Check if the message has a TTS response to play
  useEffect(() => {
    const hasTTSContent = !!message.tts_content?.audio_base64;
    setHasAudio(hasTTSContent);

    if (hasTTSContent && isLatestMessage && !audioInitialized.current) {
      // Flag that we've seen and handled this audio
      audioInitialized.current = true;
      
      // Store that this message has TTS for recovery
      if (message.id) {
        sessionStorage.setItem('TTS_MESSAGE_ID', message.id);
        sessionStorage.setItem('TTS_TIMESTAMP', Date.now().toString());
        
        // Log audio content type and length for debugging
        const audioContent = message.tts_content?.audio_base64 || '';
        const summaryAvailable = !!message.tts_content?.summary;
        console.log(
          `TTS content available for message ${message.id}:`, 
          `Base64 length: ${audioContent.length}`,
          `Summary available: ${summaryAvailable}`
        );
      }
      
      // Check if autoplay should occur
      const shouldAutoPlay = message.tts_content?.autoplay || false;
      
      if (shouldAutoPlay) {
        // Use a short delay to allow the UI to render first
        setTimeout(() => {
          const ttsNeedsUserInteraction = sessionStorage.getItem('TTS_NEEDS_USER_INTERACTION') === 'true';
          
          if (!ttsNeedsUserInteraction) {
            // Try to auto-play the audio
            console.log(`Auto-playing TTS audio for message ${message.id}`);
            setIsPlaying(true);
          } else {
            // We know we need user interaction, so don't try to auto-play
            console.log(`TTS audio requires user interaction, not auto-playing for message ${message.id}`);
          }
        }, 1000);
      }
    }
  }, [message.tts_content, isLatestMessage, message.id]);

  // Check if content is truncated
  useEffect(() => {
    if (contentRef.current) {
      // Content is truncated if scrollHeight is greater than clientHeight
      const element = contentRef.current;
      const isTruncated = element.scrollHeight > element.clientHeight;
      setIsTruncated(isTruncated);
    }
  }, [message.content]);

  // Handle audio playback start and end
  const handlePlaybackStart = () => {
    setIsPlaying(true);
    // Clear the flag that TTS needs user interaction since user has interacted
    sessionStorage.removeItem('TTS_NEEDS_USER_INTERACTION');
  };

  const handlePlaybackEnd = () => {
    setIsPlaying(false);
  };

  const handlePlaybackFailed = (error: string) => {
    console.error(`TTS playback failed: ${error}`);
    setIsPlaying(false);
    
    // If this was an autoplay error, mark that we need user interaction
    if (error.includes('NotAllowedError') || error.includes('user gesture')) {
      sessionStorage.setItem('TTS_NEEDS_USER_INTERACTION', 'true');
    }
  };

  // Component to show more or less content
  const ShowMoreButton = () => {
    if (!isTruncated) return null;
    
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setShowFullContent(!showFullContent)}
        className="mt-2"
      >
        {showFullContent ? 'Show less' : 'Show more'}
      </Button>
    );
  };

  // Check for placeholder or loading states
  if (message.is_placeholder) {
    return (
      <Card className={cn("p-4 relative mb-4 max-w-[85%] ml-auto bg-secondary text-secondary-foreground", className)}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/ai-avatar.png" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="text-sm font-medium">AI Assistant</div>
            <div className="text-sm opacity-90 animate-pulse">
              {message.content}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 relative mb-4 max-w-[85%] ml-auto bg-secondary text-secondary-foreground", className)}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src="/ai-avatar.png" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">AI Assistant</span>
            
            {hasAudio && enableTTS && (
              <div className="flex items-center gap-1">
                {isPlaying ? (
                  <SpeakerLoudIcon className="h-4 w-4 text-blue-500 animate-pulse" />
                ) : (
                  <SpeakerModerateIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <AudioPlayer
                  audioSource={message.tts_content?.audio_base64 || ''}
                  format={message.tts_content?.format || 'mp3'}
                  onPlaybackStart={handlePlaybackStart}
                  onPlaybackEnd={handlePlaybackEnd}
                  onPlaybackFailed={handlePlaybackFailed}
                  className="mr-1"
                  tiny={true}
                  autoplay={isLatestMessage && message.tts_content?.autoplay}
                  messageId={message.id}
                />
              </div>
            )}
          </div>
          
          <div 
            ref={contentRef} 
            className={cn(
              "text-sm prose prose-sm dark:prose-invert max-w-full overflow-hidden markdown-content", 
              !showFullContent && "max-h-[500px]"
            )}
          >
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ node, children, ...props }) => {
                  return <div {...props}>{children}</div>;
                },
                code: ({ node, inline, className, children, ...props }) => {
                  if (inline) {
                    return <code className={className} {...props}>{children}</code>;
                  }
                  const language = /language-(\w+)/.exec(className || '')?.[1] || '';
                  return (
                    <CodeBlock language={language || 'text'} value={children as string} />
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <ShowMoreButton />
            <ChatMessageActions
              message={message.content}
              messageId={message.id}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}; 