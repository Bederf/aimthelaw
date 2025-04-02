import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AIQueryRequest } from '@/types/api-types';
import { useAIQuery } from '@/hooks/useAIQuery';

/**
 * Demo component for the useAIQuery hook
 * Shows how to use the custom hook for AI API calls
 */
export function AIHookDemo({ clientId }: { clientId: string }) {
  const [query, setQuery] = useState('');
  const { response, isLoading, error, executeQuery } = useAIQuery();

  const handleQuerySubmit = async () => {
    if (!query.trim() || !clientId) return;
    
    // Prepare the request with proper types
    const request: AIQueryRequest = {
      query: query.trim(),
      client_id: clientId,
      use_rag: true
    };
    
    // Execute the query using our hook
    try {
      await executeQuery(request);
    } catch (err) {
      // Error is already handled by the hook
      console.error('Error caught in component:', err);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>AI Query Hook Demo</CardTitle>
        <CardDescription>
          This component uses the useAIQuery custom hook
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
              onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
            />
          </div>
          
          {response && (
            <div className="mt-4 p-4 bg-secondary/20 rounded-md">
              <h3 className="font-medium mb-2">Response:</h3>
              <p className="whitespace-pre-wrap">{response.response}</p>
              
              {response.token_usage && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Token usage: {response.token_usage.total_tokens} tokens</p>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-destructive/20 text-destructive rounded-md">
              <h3 className="font-medium mb-2">Error:</h3>
              <p>{error.message}</p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleQuerySubmit} 
          disabled={isLoading || !query.trim() || !clientId}
        >
          {isLoading ? 'Processing...' : 'Send Query'}
        </Button>
      </CardFooter>
    </Card>
  );
} 