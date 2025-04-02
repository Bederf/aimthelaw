import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, PauseIcon, StopIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

// How long to wait before giving up on autoplay
const AUTOPLAY_TIMEOUT_MS = 5000;

// Track audio instances globally to prevent duplicates during HMR
if (!window.__AUDIO_INSTANCES) {
  window.__AUDIO_INSTANCES = new Map();
}

// Create AudioContext on first load - browser limits the number of contexts
if (!window.__AUDIO_CONTEXT) {
  try {
    window.__AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.error('Failed to create AudioContext:', e);
  }
}

interface AudioPlayerProps {
  audioSource: string;
  format?: 'mp3' | 'wav' | 'ogg';
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackFailed?: (error: string) => void;
  className?: string;
  autoplay?: boolean;
  tiny?: boolean;
  messageId?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioSource,
  format = 'mp3',
  onPlaybackStart,
  onPlaybackEnd,
  onPlaybackFailed,
  className,
  autoplay = false,
  tiny = false,
  messageId,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const autoplayTimerRef = useRef<number | null>(null);
  const instanceIdRef = useRef<string>(messageId || `audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  
  // Ensure we keep track of this audio instance globally
  useEffect(() => {
    const instanceId = instanceIdRef.current;
    
    return () => {
      // Clean up global tracking on unmount
      if (window.__AUDIO_INSTANCES?.has(instanceId)) {
        const audioElement = window.__AUDIO_INSTANCES.get(instanceId);
        if (audioElement) {
          try {
            audioElement.pause();
            audioElement.src = '';
          } catch (err) {
            console.error('Error cleaning up audio:', err);
          }
        }
        window.__AUDIO_INSTANCES.delete(instanceId);
      }
      
      // Stop any playing audio buffer source
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
          audioSourceNodeRef.current.disconnect();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Load audio using AudioContext for better compatibility
  const loadAudioBuffer = async (source: string) => {
    try {
      // Get shared audio context or create new one
      const audioContext = window.__AUDIO_CONTEXT || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Resume audio context if it's suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      let audioData: ArrayBuffer;
      
      // Handle different source types
      if (source.startsWith('data:audio')) {
        // Data URL - fetch and convert to array buffer
        const response = await fetch(source, { 
          cache: 'force-cache',
          mode: 'cors',
          credentials: 'same-origin'
        });
        audioData = await response.arrayBuffer();
      } else if (source.startsWith('/9j/') || source.startsWith('GkXf')) {
        // Raw base64 - convert to data URL first, then fetch
        const dataUrl = `data:audio/${format};base64,${source}`;
        const response = await fetch(dataUrl, { 
          cache: 'force-cache',
          mode: 'cors',
          credentials: 'same-origin'
        });
        audioData = await response.arrayBuffer();
      } else {
        // Regular URL or blob URL
        const response = await fetch(source, { 
          cache: 'force-cache',
          mode: 'cors',
          credentials: 'same-origin'
        });
        if (!response.ok) {
          throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
        }
        audioData = await response.arrayBuffer();
      }
      
      // Decode audio data with timeout protection
      try {
        const audioBuffer = await Promise.race([
          audioContext.decodeAudioData(audioData),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Audio decoding timed out')), 10000)
          )
        ]) as AudioBuffer;
        
        audioBufferRef.current = audioBuffer;
        setIsLoaded(true);
        
        // Try autoplay if enabled
        if (autoplay && !hasPlaybackStarted) {
          playAudioBuffer();
        }
        
        return true;
      } catch (decodeError) {
        console.error('Error decoding audio data:', decodeError);
        
        // Fallback to traditional Audio element
        if (audioRef.current) {
          const audio = audioRef.current;
          try {
            // Create a blob URL from the audio data
            const blob = new Blob([audioData], { type: `audio/${format}` });
            const blobUrl = URL.createObjectURL(blob);
            audio.src = blobUrl;
            
            // Set up event handlers
            audio.oncanplaythrough = () => {
              setIsLoaded(true);
              if (autoplay && !hasPlaybackStarted) {
                audio.play()
                  .then(() => {
                    setIsPlaying(true);
                    setHasPlaybackStarted(true);
                    if (onPlaybackStart) onPlaybackStart();
                  })
                  .catch(playErr => {
                    console.error('Error playing audio fallback:', playErr);
                    if (onPlaybackFailed) onPlaybackFailed(`Fallback playback failed: ${playErr.message}`);
                  });
              }
            };
            
            audio.onerror = (e) => {
              console.error('Audio element error:', e);
              if (onPlaybackFailed) onPlaybackFailed(`Audio element error: ${audio.error?.message || 'Unknown error'}`);
            };
            
            return true;
          } catch (fallbackError) {
            console.error('Error with audio fallback:', fallbackError);
            if (onPlaybackFailed) onPlaybackFailed(`Error with audio fallback: ${fallbackError.message}`);
            return false;
          }
        }
        
        throw decodeError;
      }
      
    } catch (error) {
      console.error('Error loading audio buffer:', error);
      if (onPlaybackFailed) {
        onPlaybackFailed(`Error loading audio: ${error.message || 'Unknown error'}`);
      }
      return false;
    }
  };
  
  // Play audio buffer using Web Audio API
  const playAudioBuffer = () => {
    try {
      if (!audioContextRef.current || !audioBufferRef.current) {
        console.error('Cannot play: Audio context or buffer not initialized');
        return false;
      }
      
      const audioContext = audioContextRef.current;
      
      // Stop any currently playing source
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
          audioSourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignore errors when stopping previous source
        }
      }
      
      // Create new source node
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBufferRef.current;
      sourceNode.connect(audioContext.destination);
      
      // Set up event handlers
      sourceNode.onended = () => {
        setIsPlaying(false);
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
      };
      
      // Play the audio from the current offset
      sourceNode.start(0, offsetRef.current);
      audioSourceNodeRef.current = sourceNode;
      
      // Store start time for pause/resume tracking
      startTimeRef.current = audioContext.currentTime;
      
      // Update state
      setIsPlaying(true);
      setHasPlaybackStarted(true);
      if (onPlaybackStart) {
        onPlaybackStart();
      }
      
      return true;
    } catch (error) {
      console.error('Error playing audio buffer:', error);
      if (onPlaybackFailed) {
        onPlaybackFailed(`Error playing audio: ${error.message || 'Unknown error'}`);
      }
      return false;
    }
  };
  
  // Pause the currently playing audio
  const pauseAudioBuffer = () => {
    try {
      if (!audioContextRef.current || !audioSourceNodeRef.current) return;
      
      // Calculate current position to enable resuming from this point
      const audioContext = audioContextRef.current;
      const elapsedTime = audioContext.currentTime - startTimeRef.current;
      offsetRef.current += elapsedTime;
      
      // Stop the source (can't pause a source node, need to create a new one when resuming)
      audioSourceNodeRef.current.stop();
      audioSourceNodeRef.current.disconnect();
      audioSourceNodeRef.current = null;
      
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  useEffect(() => {
    // Create audio element as fallback method
    if (!audioRef.current) {
      const audio = new Audio();
      audioRef.current = audio;
      
      // Track this instance globally
      window.__AUDIO_INSTANCES.set(instanceIdRef.current, audio);
    }
    
    // Set up audio source if we have one
    if (audioSource) {
      // Try to load using Web Audio API
      loadAudioBuffer(audioSource).catch(error => {
        console.warn('Failed to load audio with AudioContext, falling back to Audio element:', error);
        
        // Fallback to traditional Audio element if AudioContext method fails
        const audio = audioRef.current;
        if (audio) {
          try {
            // Use Buffer technique for base64 data
            if (audioSource.startsWith('data:audio') || audioSource.startsWith('/9j/') || audioSource.startsWith('GkXf')) {
              let src = audioSource;
              
              // If it's a raw base64 string without data URI prefix, add it
              if (!audioSource.startsWith('data:audio')) {
                src = `data:audio/${format};base64,${audioSource}`;
              }
              
              audio.src = src;
            } else {
              // Regular URL
              audio.src = audioSource;
            }
            
            // Setup event listeners
            const handleCanPlay = () => {
              setIsLoaded(true);
              // Autoplay handling here
            };
            
            audio.addEventListener('canplay', handleCanPlay);
            
            // Load the audio
            audio.load();
            
            return () => {
              audio.removeEventListener('canplay', handleCanPlay);
            };
          } catch (err) {
            console.error('Error setting up fallback audio:', err);
          }
        }
      });
    }
  }, [audioSource, format, autoplay]);

  // Function to toggle play/pause
  const togglePlayback = () => {
    // Prefer using Web Audio API if buffer is loaded
    if (audioBufferRef.current && audioContextRef.current) {
      if (isPlaying) {
        pauseAudioBuffer();
      } else {
        playAudioBuffer();
      }
      return;
    }
    
    // Fallback to traditional Audio element
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Store the current play promise to detect if it fails
        const playPromise = audioRef.current.play();
        
        // Modern browsers return a promise from play()
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setHasPlaybackStarted(true);
            if (onPlaybackStart) {
              onPlaybackStart();
            }
          }).catch((error) => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
            
            if (onPlaybackFailed) {
              onPlaybackFailed(`Playback failed: ${error.message || 'Unknown error'}`);
            }
            
            // Special handling for autoplay policy errors
            if (error.name === 'NotAllowedError') {
              console.warn('Autoplay blocked by browser - requires user interaction');
              
              // Store in session that we need user interaction
              sessionStorage.setItem('TTS_NEEDS_USER_INTERACTION', 'true');
            }
          });
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      if (onPlaybackFailed) {
        onPlaybackFailed(`Error toggling playback: ${error}`);
      }
    }
  };

  // Function to stop playback completely
  const stopPlayback = () => {
    // Stop Web Audio API playback
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
        audioSourceNodeRef.current.disconnect();
        audioSourceNodeRef.current = null;
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    
    // Reset position tracking
    offsetRef.current = 0;
    setIsPlaying(false);
    
    // Also stop Audio element as fallback
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (error) {
        console.error('Error stopping playback:', error);
      }
    }
  };

  // Render a small play/pause button if tiny is true
  if (tiny) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-full p-0", className)}
        onClick={togglePlayback}
        title={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <PauseIcon className="h-4 w-4" />
        ) : (
          <PlayIcon className="h-4 w-4" />
        )}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"} audio</span>
      </Button>
    );
  }

  // Default player UI with play/pause and stop buttons
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button 
        variant="outline" 
        size="sm"
        className="flex items-center space-x-1 px-2 py-1"
        onClick={togglePlayback}
        disabled={!isLoaded}
        title={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <><PauseIcon className="h-3 w-3 mr-1" /> Pause</>
        ) : (
          <><PlayIcon className="h-3 w-3 mr-1" /> Play</>
        )}
      </Button>
      
      {isPlaying && (
        <Button
          variant="ghost"
          size="sm"
          className="px-2 py-1"
          onClick={stopPlayback}
          title="Stop audio"
        >
          <StopIcon className="h-3 w-3 mr-1" />
          Stop
        </Button>
      )}
    </div>
  );
};

// Extend Window interface to include our audio tracking
declare global {
  interface Window {
    __AUDIO_INSTANCES?: Map<string, HTMLAudioElement>;
    __AUDIO_CONTEXT?: AudioContext;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export default AudioPlayer; 