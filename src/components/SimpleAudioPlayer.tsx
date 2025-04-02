import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, PauseIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface SimpleAudioPlayerProps {
  audioSource: string;
  format?: 'mp3' | 'wav' | 'ogg';
  className?: string;
  autoplay?: boolean;
  messageId?: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackError?: (error: any) => void;
}

export const SimpleAudioPlayer: React.FC<SimpleAudioPlayerProps> = ({
  audioSource,
  format = 'mp3',
  className,
  autoplay = false,
  messageId,
  onPlaybackStart,
  onPlaybackEnd,
  onPlaybackError
}) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const instanceIdRef = useRef<string>(messageId || `simple-audio-${Date.now()}`);
  const lastSourceRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);
  
  // Check if we're in a quick action context
  const isQuickActionActive = useCallback((): boolean => {
    const quickActionStatus = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS');
    const timestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP');
    
    // Parse timestamp if it exists
    const actionTimestamp = timestamp ? parseInt(timestamp, 10) : 0;
    // Consider quick actions active for 5 minutes after they were initiated
    const isRecent = actionTimestamp && (Date.now() - actionTimestamp < 5 * 60 * 1000);
    
    return quickActionStatus === 'true' && isRecent;
  }, []);
  
  const handlePlayError = useCallback((error: any) => {
    console.error('Error playing audio:', error);
    
    // Increment error count
    setErrorCount(prev => prev + 1);
    const newErrorCount = errorCount + 1;
    
    // Check for specific error types
    if (error.name === 'NotAllowedError') {
      console.log('Browser requires user interaction for playback');
      // Store this in session storage for future reference
      sessionStorage.setItem('TTS_NEEDS_USER_INTERACTION', 'true');
      
      toast({
        title: "User Interaction Required",
        description: "Browser security requires you to interact with the page before audio can play.",
        variant: "default",
      });
    } else {
      // Create a more detailed error message with context
      const detailedError = {
        message: error.message || 'Unknown error',
        source: lastSourceRef.current?.substring(0, 30) + '...',
        messageId: messageId || instanceIdRef.current,
        errorCount: newErrorCount,
        isQuickAction: isQuickActionActive(),
        timestamp: new Date().toISOString()
      };
      
      console.error('Audio playback detailed error:', detailedError);
      
      // Store failure details in session storage
      if (messageId) {
        sessionStorage.setItem('FAILED_TTS_MESSAGE_ID', messageId);
        sessionStorage.setItem('FAILED_TTS_ERROR', JSON.stringify(detailedError));
      }
    }
    
    setIsPlaying(false);
    setIsError(true);
    
    if (onPlaybackError) {
      onPlaybackError(error);
    }
  }, [onPlaybackError, errorCount, messageId, toast, isQuickActionActive]);
  
  const loadAudio = useCallback(() => {
    try {
      // Return early if no audio source
      if (!audioSource || !audioRef.current) return;
      
      // Don't reload if the source hasn't changed
      if (lastSourceRef.current === audioSource) {
        // If already loaded, just log without resetting or reloading
        if (isLoaded) {
          return;
        }
      }
      
      // Update last source reference
      lastSourceRef.current = audioSource;
      
      // Reset states
      setIsError(false);
      setIsLoaded(false);
      
      // Handle different source types
      let src = audioSource;
      
      // Add more detailed debugging
      console.log(`Processing audio source for message ${messageId || instanceIdRef.current} (type: ${typeof audioSource}, length: ${audioSource?.length || 'unknown'})`);
      
      // If source is base64 without data URL prefix, add it
      if (typeof audioSource === 'string') {
        if (audioSource.startsWith('/9j/') || audioSource.startsWith('GkXf') || audioSource.startsWith('SUQz')) {
          console.log('Detected base64 audio without proper prefix, adding data URL prefix');
          src = `data:audio/${format};base64,${audioSource}`;
        } else if (audioSource.includes('base64,')) {
          // Source already has data URL format
          console.log('Source already has data URL format');
          src = audioSource;
        }
        
        // Check for malformed source
        if (src.startsWith('data:') && !src.includes('base64,')) {
          console.error('Malformed data URL:', src.substring(0, 50) + '...');
          throw new Error('Malformed data URL');
        }
      } else {
        console.error('Invalid audio source type:', typeof audioSource);
        throw new Error('Invalid audio source type');
      }
      
      // Set the source and add cache-busting parameter for URLs
      if (!src.startsWith('data:')) {
        const cacheBuster = `cb=${Date.now()}`;
        src = src.includes('?') ? `${src}&${cacheBuster}` : `${src}?${cacheBuster}`;
      }
      
      // Log detailed debugging info
      console.log(`Setting audio source for ${instanceIdRef.current} (${src.substring(0, 50)}...), isQuickAction: ${isQuickActionActive()}`);
      
      // Set the source
      audioRef.current.src = src;
      
      // Set cross-origin attribute for network requests
      if (!src.startsWith('data:')) {
        audioRef.current.crossOrigin = 'anonymous';
      }
      
      // Force reload of the audio to ensure it's fresh
      audioRef.current.load();
      
      console.log(`Audio source set for ${instanceIdRef.current}`);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsError(true);
      if (onPlaybackError) {
        onPlaybackError({
          message: error instanceof Error ? error.message : 'Unknown error loading audio',
          code: 'LOADING_ERROR',
          source: 'loadAudio'
        });
      }
    }
  }, [audioSource, format, onPlaybackError, isLoaded, messageId, isQuickActionActive]);
  
  const playAudio = useCallback(() => {
    if (!audioRef.current || isError) return;
    
    // Only allow playback during quick actions
    if (!isQuickActionActive()) {
      console.log('Attempted to play audio outside of a quick action, blocking playback');
      toast({
        title: "Audio Playback Restricted",
        description: "Audio is only available during quick actions",
        variant: "default"
      });
      return;
    }
    
    // Check if audio is loaded
    if (!isLoaded) {
      console.log('Audio not loaded yet, trying to load and play');
      audioRef.current.load();
      
      // Set up a one-time event listener for canplaythrough
      const canPlayHandler = () => {
        console.log('Audio canplaythrough event triggered, attempting playback');
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              console.log('Playback started successfully');
              setIsPlaying(true);
              if (onPlaybackStart) onPlaybackStart();
            })
            .catch((err) => {
              console.error('Error starting playback after canplaythrough event:', err);
              handlePlayError(err);
            });
          
          audioRef.current.removeEventListener('canplaythrough', canPlayHandler);
        }
      };
      
      // Also set up timeout for canplaythrough event
      const timeoutId = setTimeout(() => {
        if (audioRef.current) {
          console.warn('Canplaythrough event not fired within timeout, attempting playback anyway');
          audioRef.current.removeEventListener('canplaythrough', canPlayHandler);
          
          audioRef.current.play()
            .then(() => {
              console.log('Forced playback started successfully after timeout');
              setIsPlaying(true);
              if (onPlaybackStart) onPlaybackStart();
            })
            .catch(handlePlayError);
        }
      }, 3000);
      
      // Clean up the timeout when component unmounts or canplaythrough fires
      const cleanup = () => {
        clearTimeout(timeoutId);
        if (audioRef.current) {
          audioRef.current.removeEventListener('canplaythrough', canPlayHandler);
        }
      };
      
      audioRef.current.addEventListener('canplaythrough', canPlayHandler);
      return cleanup;
    }
    
    // Play audio
    console.log('Attempting to play already loaded audio');
    audioRef.current.play()
      .then(() => {
        console.log('Playback started successfully');
        setIsPlaying(true);
        if (onPlaybackStart) onPlaybackStart();
      })
      .catch((err) => {
        console.error('Error playing loaded audio:', err);
        handlePlayError(err);
      });
  }, [isError, isLoaded, onPlaybackStart, handlePlayError, toast, isQuickActionActive]);
  
  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    if (onPlaybackEnd) {
      onPlaybackEnd();
    }
  }, [onPlaybackEnd]);
  
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }, [isPlaying, pauseAudio, playAudio]);
  
  const handleRetry = useCallback(() => {
    if (!audioSource) return;
    
    // Increment retry count
    retryCountRef.current += 1;
    console.log(`Retrying audio playback (attempt ${retryCountRef.current})`);
    
    // Reset errors
    setIsError(false);
    
    // Only allow retries during quick actions
    if (!isQuickActionActive()) {
      console.log('Attempted to retry audio outside of a quick action');
      toast({
        title: "Audio Restricted",
        description: "Audio is only available during quick actions",
        variant: "default"
      });
      return;
    }
    
    // Try with a different audio format if we've had multiple failures
    if (retryCountRef.current > 1 && audioSource.includes('audio/mp3')) {
      console.log('Retrying with audio/mpeg instead of audio/mp3');
      const newSource = audioSource.replace('audio/mp3', 'audio/mpeg');
      lastSourceRef.current = newSource;
      
      if (audioRef.current) {
        audioRef.current.src = newSource;
        audioRef.current.load();
        
        audioRef.current.play()
          .then(() => {
            console.log('Retry playback successful with audio/mpeg format');
            setIsPlaying(true);
            setIsError(false);
            if (onPlaybackStart) onPlaybackStart();
          })
          .catch(handlePlayError);
      }
    } else {
      // Standard retry with same source
      loadAudio();
      setTimeout(playAudio, 100);
    }
  }, [audioSource, loadAudio, playAudio, handlePlayError, onPlaybackStart, toast, isQuickActionActive]);
  
  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up error handler
      audio.onerror = (e) => {
        console.error('Audio playback error:', e, audio.error);
        setIsError(true);
        setIsPlaying(false);
        
        // Get detailed error information
        let errorMessage = 'Unknown error';
        let errorCode = 'UNKNOWN';
        
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted';
              errorCode = 'ABORTED';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error';
              errorCode = 'NETWORK';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Failed to decode audio';
              errorCode = 'DECODE';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Format not supported';
              errorCode = 'FORMAT';
              break;
            default:
              errorMessage = `Audio error: ${audio.error.message || 'Unknown error'}`;
              errorCode = 'OTHER';
          }
        }
        
        if (onPlaybackError) {
          onPlaybackError({
            message: `Failed to open media: ${errorMessage}`,
            code: errorCode,
            source: 'audio.onerror',
            originalError: audio.error
          });
        }
      };
      
      // Set up end handler
      audio.onended = () => {
        setIsPlaying(false);
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
      };
      
      // Set up pause handler
      audio.onpause = () => {
        setIsPlaying(false);
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
      };
      
      // Set up play handler
      audio.onplay = () => {
        setIsPlaying(true);
        if (onPlaybackStart) {
          onPlaybackStart();
        }
      };
      
      // Set up canplay handler
      audio.oncanplay = () => {
        setIsLoaded(true);
        
        // Auto-play if enabled and in a quick action
        if (autoplay && !isPlaying && isQuickActionActive()) {
          console.log('Auto-playing audio in quick action context');
          playAudio();
        } else if (autoplay && !isQuickActionActive()) {
          console.log('Auto-play suppressed outside of quick action');
        }
      };
    }
    
    // Only load audio if the source has changed or not been loaded yet
    if (audioSource !== lastSourceRef.current || !isLoaded) {
      loadAudio();
    }
    
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [audioSource, autoplay, isPlaying, loadAudio, onPlaybackEnd, onPlaybackError, onPlaybackStart, playAudio, isLoaded, isQuickActionActive]);

  // If there's an error or no audio source, still render the player but with retry capability
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('p-1 h-8 w-8 rounded-full', className, isError ? 'text-red-500' : '')}
      onClick={isError ? handleRetry : togglePlayback}
      disabled={!isLoaded && !isError}
      title={isError ? "Retry audio playback" : (isPlaying ? "Pause audio" : "Play audio")}
    >
      {isError ? (
        <AlertTriangle className="h-4 w-4" />
      ) : isPlaying ? (
        <PauseIcon className="h-4 w-4" />
      ) : (
        <PlayIcon className="h-4 w-4" />
      )}
    </Button>
  );
};

export default SimpleAudioPlayer; 