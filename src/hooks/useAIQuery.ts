import { useState, useCallback } from 'react';
import { apiClient } from '@/api/apiClient';
import { AIQueryRequest, AIResponse } from '@/types/api-types';

/**
 * Custom hook for making AI queries with loading and error states
 */
export function useAIQuery() {
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute an AI query with the API client
   */
  const executeQuery = useCallback(async (requestData: AIQueryRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.queryAI(requestData);
      setResponse(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset the state (useful when unmounting or changing context)
   */
  const reset = useCallback(() => {
    setResponse(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    response,
    isLoading,
    error,
    executeQuery,
    reset
  };
}

export default useAIQuery; 