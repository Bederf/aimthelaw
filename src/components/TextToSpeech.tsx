import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/apiClient';
import { recordAudioPlaybackError, setWSLPreference, getWSLPreference, getIframePlaybackPreference, setIframePlaybackPreference } from '@/utils/environment';

interface TextToSpeechProps {
  text: string;
  className?: string;
  compact?: boolean;
  includeQuestion?: boolean;
  onQuestionPlayed?: () => void;
  disablePlay?: boolean;
  onError?: (error: any) => void;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy (Neutral)' },
  { id: 'echo', name: 'Echo (Male)' },
  { id: 'fable', name: 'Fable (Male)' },
  { id: 'onyx', name: 'Onyx (Male)' },
  { id: 'nova', name: 'Nova (Female)' },
  { id: 'shimmer', name: 'Shimmer (Female)' },
  { id: 'coral', name: 'Coral (Female)' }
];

const TextToSpeech: React.FC<TextToSpeechProps> = ({ 
  text, 
  className = '', 
  compact = true,
  includeQuestion = false,
  onQuestionPlayed,
  disablePlay = false,
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioBlobData, setAudioBlobData] = useState<Blob | null>(null);
  const [voice, setVoice] = useState('nova');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [autoOpen, setAutoOpen] = useState<boolean>(localStorage.getItem('tts-auto-open') === 'true');
  const [iframeMode, setIframeMode] = useState<boolean>(getIframePlaybackPreference());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { toast } = useToast();
  const lastTextRef = useRef(text);
  const streamUrlRef = useRef<string | null>(null);
  const [showPlayButton, setShowPlayButton] = useState(false);

  // Effect to handle text changes and auto-generate audio
  useEffect(() => {
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      console.log('Text changed, generating audio');
      generateAudio(disablePlay);
    }
  }, [text, disablePlay]);

  useEffect(() => {
    // Cleanup function to release audio resources
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioSrc) {
          URL.revokeObjectURL(audioSrc);
          setAudioSrc(null);
        }
      }
      // Clean up any stream URL
      if (streamUrlRef.current) {
        streamUrlRef.current = null;
      }
    };
  }, [audioSrc]);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('tts-auto-open', autoOpen.toString());
    setIframePlaybackPreference(iframeMode);
  }, [autoOpen, iframeMode]);

  // Add effect to attempt autoplay when audio is available
  useEffect(() => {
    if (audioSrc && audioRef.current && !disablePlay) {
      console.log('Audio source available, attempting autoplay');
      
      // Set initial muted state to bypass autoplay restrictions
      audioRef.current.muted = true;
      
      // Make sure audio is loaded
      audioRef.current.load();
      
      // Make sure the play button is shown as a fallback
      setShowPlayButton(true);
      
      // Try multiple autoplay strategies
      const tryAutoplay = async () => {
        try {
          console.log('Attempting autoplay with muted audio first');
          // First attempt: play muted
          await audioRef.current?.play();
          setIsPlaying(true);
          
          // Playback started successfully - now we can unmute after a short delay
          setTimeout(() => {
            if (audioRef.current && audioRef.current.paused === false) {
              console.log('Unmuting successful autoplay');
              audioRef.current.muted = false;
              audioRef.current.volume = 1.0;
            }
          }, 200);
        } catch (error) {
          console.warn('Muted autoplay was prevented:', error);
          handleAudioError(error);
        }
      };
      
      // Start the autoplay attempt
      tryAutoplay();
    }
  }, [audioSrc, disablePlay, onError]);

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const generateAudio = async (skipAutoPlay = false) => {
    if (isLoading || !text) return;

    try {
      setIsLoading(true);
      setError(null);
      setLastDownload(null);

      // Debug log for TTS request
      console.log(`TTS Request: ${text.length} chars, voice=${voice}, includeQuestion=${includeQuestion}`);

      // For WSL environments, use streaming method
      if (disablePlay) {
        console.log("Using streaming TTS API for WSL environment");
        try {
          // Create direct streaming URL for iframe mode
          if (iframeMode) {
            // Get a URL to the streaming endpoint
            const streamUrl = api.getStreamingAudioUrl(
              text.substring(0, 4000),
              {
                voice: voice,
                summarize: true,
                include_question: includeQuestion
              }
            );
            
            streamUrlRef.current = streamUrl;
            console.log("Generated streaming URL for iframe:", streamUrl);
            
            // Set audio source to trigger iframe update
            setAudioSrc(streamUrl);
            toast({
              title: "Audio Streaming",
              description: "Audio is now playing in the embedded player. If you can't hear anything, try using the download option."
            });

            setIsLoading(false);
            return;
          }
          
          // Otherwise use the streaming API to get a blob
          const streamResponse = await api.textToSpeechStreaming(
            text.substring(0, 4000),
            {
              voice: voice,
              model: "tts-1", 
              summarize: true,
              include_question: includeQuestion
            }
          );

          if (!streamResponse.success) {
            throw new Error('Failed to stream audio from server');
          }

          // Validate audio data
          if (streamResponse.blob.size < 1000) {
            throw new Error(`Audio data seems too small (${streamResponse.blob.size} bytes). Try refreshing or switching to iframe mode.`);
          }

          // Set audio URL directly from streaming response
          const url = streamResponse.audioUrl;
          setAudioSrc(url);
          setAudioBlobData(streamResponse.blob);
          
          // Create audio element
          if (!audioRef.current) {
            audioRef.current = new Audio(url);
            
            // Set up audio end event handler
            audioRef.current.onended = () => {
              setIsPlaying(false);
              if (includeQuestion && onQuestionPlayed) {
                onQuestionPlayed();
              }
            };
          } else {
            audioRef.current.src = url;
          }

          // Auto-download in WSL mode
          const timeoutId = setTimeout(() => {
            handleDownload();
          }, 500);
          
          return;
        } catch (streamingError) {
          console.error("Streaming TTS failed:", streamingError);
          setError(`Streaming failed: ${streamingError.message || 'Unknown error'}. Try switching to iframe mode or downloading.`);
          
          if (onError) {
            onError(streamingError);
          }
          
          toast({
            variant: "destructive",
            title: "Text-to-Speech Error",
            description: "Failed to stream audio. Try switching to iframe mode or download mode in settings."
          });
          
          setIsLoading(false);
          return;
        }
      } else {
        // Normal environment, use the standard TTS API
        const response = await api.textToSpeechWithQuestion(
          text.substring(0, 4000), 
          voice,
          {
            // Add autoplay flag to inform backend this is for immediate playback
            autoplay: true,
            format: 'mp3'
          }
        );
        
        // Log response size and format for debugging
        console.log(`TTS Response: success=${response.success}, audio size=${response.audio_base64?.length || 0}, format=${response.format}`, {
          summaryProvided: !!response.summary,
          summaryLength: response.summary ? response.summary.length : 0,
          format: response.format
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to convert text to speech');
        }

        // Validate response data
        if (!response.audio_base64 || response.audio_base64.length < 1000) {
          const audioData = response.audio_base64 || "";
          console.error(`Invalid audio data: length=${audioData.length}, preview=${audioData.substring(0, 50)}...`);
          throw new Error('Invalid audio data received from server - too small or empty');
        }

        // Store the summary if it exists
        if (response.summary) {
          setSummary(response.summary);
        }

        // Create audio from base64
        const audioData = response.audio_base64;
        const blob = await fetch(`data:audio/mp3;base64,${audioData}`).then(res => res.blob());
        
        // Validate blob size
        if (blob.size < 1000) {
          console.error(`Audio blob too small: ${blob.size} bytes`);
          throw new Error(`Audio data seems suspiciously small (${blob.size} bytes). Possibly a placeholder or corrupted file.`);
        }
        
        console.log(`Created audio blob: ${blob.size} bytes, type=${blob.type}`);
        const url = URL.createObjectURL(blob);
        
        setAudioSrc(url);
        setAudioBlobData(blob);
        
        // Create audio element
        if (!audioRef.current) {
          audioRef.current = new Audio(url);
          
          // Set up audio end event handler
          audioRef.current.onended = () => {
            setIsPlaying(false);
            if (includeQuestion && onQuestionPlayed) {
              onQuestionPlayed();
            }
          };
        } else {
          audioRef.current.src = url;
        }
        
        // Prepare audio for autoplay
        audioRef.current.load();
        
        // Check if response indicates it's ready for autoplay (from quick action)
        if (response.readyForAutoplay) {
          console.log('Response indicated readiness for autoplay');
          // This will be picked up by the useEffect that handles autoplay
        }
        
        // Always show play button as a fallback
        setShowPlayButton(true);
      }
      
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Speech synthesis unavailable');
      setIsLoading(false);
      setShowPlayButton(false);
      
      // Handle error through provided callback if available
      if (onError) onError(err);
    }
  };

  const handlePlayPause = async () => {
    if (isLoading) return;

    try {
      if (!audioSrc) {
        await generateAudio(false);
      } else {
        // Toggle play/pause on existing audio
        if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current?.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('Error in handlePlayPause:', err);
      setError(err instanceof Error ? err.message : 'Error playing audio');
    }
  };

  const handleDownload = () => {
    if (!audioSrc || !audioBlobData) return;
    
    try {
      // Create a download link for the audio
      const downloadLink = document.createElement('a');
      downloadLink.href = audioSrc;
      
      // Create a filename with timestamp and voice
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${voice}-audio-${timestamp}.mp3`;
      downloadLink.download = filename;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Save the name of the downloaded file
      setLastDownload(filename);
      
      // Show success message with instructions for WSL users
      if (disablePlay) {
        toast({
          title: "Audio Downloaded",
          description: 
            "The audio file has been downloaded. In WSL environments, you'll need to open it manually with your Windows media player.",
          duration: 5000
        });
      } else {
        toast({
          title: "Audio Downloaded",
          description: `The audio file "${filename}" has been downloaded successfully.`,
          duration: 3000
        });
      }
      
      // If auto-open is enabled, try to open the file
      if (autoOpen) {
        // This will only work if the browser allows opening local files
        // For security reasons, most browsers restrict this
        try {
          window.open(audioSrc, '_blank');
        } catch (openError) {
          console.warn('Could not automatically open audio file:', openError);
          // Don't show an error toast for this, as it's expected in many cases
        }
      }
    } catch (downloadError) {
      console.error('Error downloading audio:', downloadError);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download the audio file. Please try again."
      });
    }
  };

  // Automatically trigger download if in WSL mode and audio is available
  useEffect(() => {
    if (disablePlay && audioSrc && audioBlobData && !iframeMode) {
      console.log(`Audio data available in WSL mode, size: ${audioBlobData.size} bytes`);
      
      // Validate audio data
      if (audioBlobData.size < 2000) {
        console.error(`Audio data appears invalid (only ${audioBlobData.size} bytes)`);
        setError("Audio generation incomplete. Please try again.");
        toast({
          variant: "destructive",
          title: "Audio Generation Warning",
          description: "The audio file appears to be too small, which may indicate a problem with the TTS service or API key.",
          duration: 5000
        });
      } else {
        console.log("Audio data validation passed, proceeding with download");
        // Small delay to ensure UI is responsive
        const timeoutId = setTimeout(() => {
          handleDownload();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [disablePlay, audioSrc, audioBlobData, iframeMode]);

  // Add a manual play function with proper error handling
  const handleManualPlay = () => {
    if (!audioRef.current) return;
    
    // Make sure audio is not muted for manual play
    audioRef.current.muted = false;
    audioRef.current.volume = 1.0;
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error) => {
        console.error('Error playing audio manually:', error);
        
        // Show a more helpful error message based on error type
        if (error.name === 'NotAllowedError') {
          setError('Browser blocked audio playback. Try clicking the play button again.');
          toast({
            variant: "destructive",
            title: "Audio Playback Blocked",
            description: "Your browser is blocking automatic audio playback. Please click the play button again or change your browser settings."
          });
        } else {
          handleAudioError(error);
        }
      });
  };

  // Function to handle audio errors more comprehensively
  const handleAudioError = (error: any) => {
    console.error('Audio playback error:', error);
    
    // Show appropriate error based on error type
    let errorMessage = 'Audio playback failed';
    
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Browser blocked autoplay. Please click the play button.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Audio playback was aborted';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio format not supported by your browser';
      }
    }
    
    // Don't show errors for autoplay restrictions, just show the play button
    if (error.name === 'NotAllowedError') {
      setShowPlayButton(true);
    } else {
      setError(errorMessage);
      if (onError) onError(error);
    }
    
    // Record error for future environment detection
    recordAudioPlaybackError(error);
  };

  // Only display text-to-speech for messages with actual content
  if (!text || text.trim().length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {error && <span className="text-destructive text-xs mr-2">{error}</span>}
      
      {!compact && (
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent>
            {VOICES.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {!disablePlay && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? 'Pause' : 'Play'} audio{includeQuestion ? ' with follow-up question' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Download button */}
      {audioSrc && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download audio file</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Open in Windows Media Player - only show in WSL mode */}
      {audioSrc && disablePlay && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-blue-500" 
                onClick={() => window.open(audioSrc, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in Windows Media Player</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {audioSrc && !disablePlay && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={resetAudio}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Restart audio</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* WSL specific controls - only show when not compact */}
      {!compact && disablePlay && (
        <div className="flex items-center space-x-2 ml-4">
          <div className="flex items-center space-x-2 mr-4">
            <Switch 
              id="iframe-mode"
              checked={iframeMode}
              onCheckedChange={setIframeMode}
            />
            <Label htmlFor="iframe-mode" className="text-sm">Use embedded player</Label>
          </div>
          
          <Switch 
            id="auto-open"
            checked={autoOpen}
            onCheckedChange={setAutoOpen}
          />
          <Label htmlFor="auto-open" className="text-sm">Auto-open downloads</Label>
        </div>
      )}
      
      {/* Show iframe player when in iframe mode */}
      {disablePlay && iframeMode && audioSrc && (
        <div className="ml-2 flex-1 max-w-[300px] h-8">
          <iframe
            ref={iframeRef}
            src={audioSrc}
            className="w-full h-full border-0"
            allow="autoplay"
            title="Audio player"
          />
        </div>
      )}
      
      {/* Last download info */}
      {lastDownload && disablePlay && !iframeMode && (
        <div className="ml-2 flex items-center text-sm text-muted-foreground">
          <Check className="h-3 w-3 mr-1 text-green-500" />
          <span className="truncate max-w-[200px]">{lastDownload}</span>
        </div>
      )}
      
      {compact && (
        <span className="text-xs text-muted-foreground">
          {VOICES.find(v => v.id === voice)?.name.split(' ')[0]}
          {includeQuestion && ' + Q'}
        </span>
      )}
      
      {/* Add a visible play button when audio is ready */}
      {showPlayButton && !isPlaying && (
        <Button 
          onClick={handleManualPlay} 
          variant="secondary" 
          size="sm" 
          className="play-button">
          <Play className="mr-1 h-4 w-4" /> Play Audio
        </Button>
      )}
    </div>
  );
};

export default TextToSpeech; 