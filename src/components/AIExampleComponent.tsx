import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { api } from '@/api/apiClient';
import { AIQueryRequest, AIResponse } from '@/types/api-types';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Example component demonstrating direct API client usage
 * This shows how to use the type-safe API client in React components
 */
export function AIExampleComponent({ clientId }: { clientId: string }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAIQuery = async () => {
    if (!query.trim() || !clientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a properly typed request
      const request: AIQueryRequest = {
        query: query.trim(),
        client_id: clientId,
        use_rag: true
      };
      
      // Make the API call with type safety
      const result: AIResponse = await api.queryAI(request);
      
      // Use the typed response
      setResponse(result.response);
      
      // Log token usage if available
      if (result.token_usage) {
        console.log('Token usage:', result.token_usage.total_tokens);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('AI query error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>AI Query Example</CardTitle>
        <CardDescription>
          This component uses the typed API client directly
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Ask the AI a question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleAIQuery()}
            />
          </div>
          
          {response && (
            <div className="mt-4 p-4 bg-secondary/20 rounded-md">
              <h3 className="font-medium mb-2">Response:</h3>
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-destructive/20 text-destructive rounded-md">
              <h3 className="font-medium mb-2">Error:</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleAIQuery} 
          disabled={isLoading || !query.trim() || !clientId}
        >
          {isLoading ? 'Querying...' : 'Send Query'}
        </Button>
      </CardFooter>
    </Card>
  );
} 