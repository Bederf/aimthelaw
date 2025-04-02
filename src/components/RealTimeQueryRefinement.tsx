import React, { useState, useRef, useEffect } from 'react';
import { useAIStreamQuery } from '@/hooks/useAIStreamQuery';
import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
import { AIQueryRequest } from '@/types/api-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, X, RefreshCw, ChevronRight } from 'lucide-react';

interface RealTimeQueryRefinementProps {
  clientId: string;
  documents?: string[];
  onSubmit?: (query: string, response: string) => void;
}

/**
 * Real-time Query Refinement Component
 * Combines streaming responses with query suggestions
 */
export function RealTimeQueryRefinement({ clientId, documents = [], onSubmit }: RealTimeQueryRefinementProps) {
  const responseRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Use our custom hooks
  const {
    streamingContent,
    isStreaming,
    isDone,
    tokenUsage,
    error,
    startStreaming,
    cancelStreaming,
    reset: resetStreaming
  } = useAIStreamQuery();
  
  const {
    query,
    suggestions,
    isLoading: isLoadingSuggestions,
    updateQuery,
    selectSuggestion,
    clearSuggestions
  } = useQuerySuggestions(clientId);
  
  // Scroll to bottom of response as new content arrives
  useEffect(() => {
    if (responseRef.current && isStreaming) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming]);
  
  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleSubmit = async () => {
    if (!query.trim() || !clientId || isStreaming) return;
    
    // Hide suggestions when submitting
    setShowSuggestions(false);
    clearSuggestions();
    
    // Create the request
    const request: AIQueryRequest = {
      query: query.trim(),
      client_id: clientId,
      use_rag: true,
      documents: documents.length > 0 ? documents : undefined
    };
    
    // Start streaming the response
    await startStreaming(request);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Cancel on Escape
    if (e.key === 'Escape') {
      if (isStreaming) {
        cancelStreaming();
      } else {
        clearSuggestions();
      }
    }
  };
  
  const handleReset = () => {
    resetStreaming();
    // Refocus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Show suggestions again for the next query
    setShowSuggestions(true);
  };
  
  const handleSelectionClick = (suggestion: string) => {
    selectSuggestion(suggestion);
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // When streaming completes, call onSubmit if provided
  useEffect(() => {
    if (isDone && onSubmit && query && streamingContent) {
      onSubmit(query, streamingContent);
    }
  }, [isDone, onSubmit, query, streamingContent]);
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Enter your legal query here..."
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          disabled={isStreaming}
          onKeyDown={handleKeyDown}
          className="pr-10"
        />
        
        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <div className="absolute right-3 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Clear button */}
        {query && !isStreaming && (
          <button 
            onClick={() => updateQuery('')}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Query suggestions */}
        {suggestions.length > 0 && showSuggestions && (
          <Card className="absolute z-10 w-full mt-1 shadow-lg">
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground mb-2">Suggested improvements:</div>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="p-2 cursor-pointer hover:bg-accent rounded-md text-sm flex items-center gap-2"
                    onClick={() => handleSelectionClick(suggestion)}
                  >
                    <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={handleSubmit} 
          disabled={isStreaming || !query.trim() || !clientId}
          className="flex-1"
        >
          {isStreaming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" /> Submit
            </>
          )}
        </Button>
        
        {isStreaming ? (
          <Button 
            variant="outline" 
            onClick={cancelStreaming}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        ) : streamingContent && (
          <Button 
            variant="outline" 
            onClick={handleReset}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> New Query
          </Button>
        )}
      </div>
      
      {/* Response area */}
      {(streamingContent || isStreaming) && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Response</span>
              {isDone && tokenUsage && (
                <Badge variant="outline" className="text-xs">
                  {tokenUsage.total_tokens || 0} tokens
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={responseRef}
              className="max-h-[400px] overflow-y-auto p-4 bg-muted/50 rounded-md whitespace-pre-wrap"
            >
              {streamingContent || 'Waiting for response...'}
              {isStreaming && (
                <span className="animate-pulse ml-1">▌</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error display */}
      {error && (
        <Card className="mt-4 border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-destructive/10 rounded-md text-destructive">
              {error.message}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 