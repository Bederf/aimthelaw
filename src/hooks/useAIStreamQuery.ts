import { useState, useCallback, useRef, useEffect } from 'react';
import streamingClient, { ResponseChunk } from '@/api/streamingClient';
import { AIQueryRequest } from '@/types/api-types';

// Extend the ResponseChunk interface to include token_usage
interface ExtendedResponseChunk extends ResponseChunk {
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface Source {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

// Update the StreamingParams interface to include conversation_history and conversation_id
interface StreamingParams {
  query: string;
  client_id: string;
  documents: string[];
  model: string;
  use_rag: boolean;
  system_prompt: string;
  conversation_history?: Array<{role: string, content: string}>;
  conversation_id?: string;
}

/**
 * Hook for streaming AI query responses with type safety
 */
export function useAIStreamQuery() {
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Cleanup streaming connections on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Reset streaming state
   */
  const resetStreaming = useCallback(() => {
    setStreamingContent('');
    setIsStreaming(false);
    setIsDone(false);
    setTokenUsage(null);
    setSources([]);
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  /**
   * Start streaming a query response
   */
  const startStreaming = useCallback(async (requestData: StreamingParams) => {
    // Reset state
    setStreamingContent('');
    setIsStreaming(true);
    setIsDone(false);
    setTokenUsage(null);
    setSources([]);
    setError(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    try {
      console.log('Starting streaming with request:', requestData);
      
      // Use the generator to stream responses
      const generator = streamingClient.streamQueryAI(requestData);
      
      // Process each chunk as it arrives
      for await (const chunk of generator) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        // Handle errors
        if (chunk.error) {
          throw new Error(chunk.error);
        }
        
        // Handle welcome message or complete message
        if (chunk.type === 'welcome' || chunk.type === 'complete') {
          if (chunk.content) {
            setStreamingContent(chunk.content);
          }
          setIsDone(true);
          break;
        }
        
        // Append content chunks to the state
        if (chunk.content) {
          setStreamingContent(prev => prev + chunk.content);
        }
        
        // Handle completion
        if (chunk.done) {
          setIsDone(true);
          
          // Handle token usage if available
          const extendedChunk = chunk as ExtendedResponseChunk;
          if (extendedChunk.token_usage) {
            console.log('Setting token usage:', extendedChunk.token_usage);
            setTokenUsage(extendedChunk.token_usage);
          }
          
          // Handle sources if available
          if (chunk.sources) {
            console.log('Setting sources:', chunk.sources);
            // Map the sources to include an id
            const sourcesWithIds = chunk.sources.map((source, index) => ({
              id: `source-${index}`,
              content: source.content,
              metadata: source.metadata
            }));
            setSources(sourcesWithIds);
          }
          break;
        }
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        // Just a cancellation, not an error
        console.log('Streaming cancelled by user');
      } else {
        // Real error
        const error = err instanceof Error ? err : new Error('Unknown streaming error');
        setError(error);
        console.error('Streaming error:', error);
      }
    } finally {
      // Only set streaming to false if we haven't been aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    }
  }, []);
  
  /**
   * Cancel the current streaming request
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);
  
  return {
    streamingContent,
    isStreaming,
    isDone,
    tokenUsage,
    sources,
    error,
    startStreaming,
    cancelStreaming,
    resetStreaming
  };
} 