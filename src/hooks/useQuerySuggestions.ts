import { useState, useEffect, useCallback, useRef } from 'react';
import streamingClient from '@/api/streamingClient';
import { AIQueryRequest } from '@/types/api-types';

/**
 * Hook for getting real-time query suggestions as user types
 */
export function useQuerySuggestions(clientId: string) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');
  
  /**
   * Generate suggestions based on the current query input
   */
  const generateSuggestions = useCallback(async (currentQuery: string) => {
    if (currentQuery.length < 3 || !clientId || currentQuery === lastQueryRef.current) {
      return;
    }
    
    lastQueryRef.current = currentQuery;
    setIsLoading(true);
    
    try {
      // Create the request with clientId
      const request: AIQueryRequest = {
        query: currentQuery,
        client_id: clientId,
        use_rag: false  // Don't need RAG for suggestions
      };
      
      // Get suggestions
      const suggestionResults = await streamingClient.getQuerySuggestions(request);
      
      // Update suggestions if query hasn't changed while waiting
      if (currentQuery === lastQueryRef.current) {
        setSuggestions(suggestionResults);
      }
    } catch (error) {
      console.error('Error getting query suggestions:', error);
      // Don't show error state to user, just clear suggestions
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);
  
  /**
   * Update query and trigger suggestions with debounce
   */
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Clear suggestions if query is too short
    if (newQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    
    // Set debounce timer for suggestions
    timerRef.current = setTimeout(() => {
      generateSuggestions(newQuery);
    }, 500); // 500ms debounce
  }, [generateSuggestions]);
  
  /**
   * Select a suggestion
   */
  const selectSuggestion = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);  // Clear suggestions after selection
    lastQueryRef.current = suggestion;
  }, []);
  
  /**
   * Clear suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);
  
  /**
   * Reset everything
   */
  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setIsLoading(false);
    lastQueryRef.current = '';
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return {
    query,
    suggestions,
    isLoading,
    updateQuery,
    selectSuggestion,
    clearSuggestions,
    reset
  };
} 