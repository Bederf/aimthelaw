import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { AIExampleComponent } from '@/components/AIExampleComponent';
import { AIHookDemo } from '@/pages/lawyer/components/AIHookDemo';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Documentation page showing different ways to use the API client
 */
export function APIClientUsagePage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">API Client Documentation</h1>
        
        <div className="space-y-8">
          {/* Overview section */}
          <Card>
            <CardHeader>
              <CardTitle>Type-Safe API Client</CardTitle>
              <CardDescription>
                This page demonstrates different ways to use the type-safe API client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p>
                  Our API client provides several methods to interact with the backend API:
                </p>
                <ul>
                  <li>Direct usage through the <code>apiClient</code> object</li>
                  <li>Using the <code>ModernAIService</code> as a drop-in replacement for the original service</li>
                  <li>Using the <code>useAIQuery</code> React hook for simplified state management</li>
                </ul>
                <p>
                  All these methods provide type safety through the TypeScript types generated from the FastAPI schema.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Examples in tabs */}
          <Tabs defaultValue="direct">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="direct">Direct Usage</TabsTrigger>
              <TabsTrigger value="service">Service Usage</TabsTrigger>
              <TabsTrigger value="hook">Hook Usage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="direct" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Direct API Client Usage</CardTitle>
                  <CardDescription>
                    Import and use the apiClient directly in your components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/20 rounded-md p-4 mb-4">
                    <pre className="text-sm">
                      {`import { apiClient } from '@/api/apiClient';
import { AIQueryRequest, AIResponse } from '@/types/api-types';

// In your component:
const handleSubmit = async () => {
  try {
    const request: AIQueryRequest = {
      query: "My question",
      client_id: clientId,
      use_rag: true
    };
    
    const response: AIResponse = await apiClient.queryAI(request);
    console.log(response.response);
  } catch (error) {
    console.error(error);
  }
};`}
                    </pre>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Live Example:</h3>
                    <AIExampleComponent clientId={clientId} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="service" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ModernAIService Usage</CardTitle>
                  <CardDescription>
                    Use the ModernAIService as a drop-in replacement for AIService
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/20 rounded-md p-4 mb-4">
                    <pre className="text-sm">
                      {`import { ModernAIService } from '@/services/modernAIService';

// Initialize the service
const aiService = new ModernAIService(clientId);

// Use methods like in the original service
const handleSubmit = async () => {
  try {
    const response = await aiService.sendMessage(
      "My question",
      [], // documentIds
      "gpt-4", // model
      null, // conversationId
      [] // previousMessages
    );
    
    console.log(response.message);
  } catch (error) {
    console.error(error);
  }
};`}
                    </pre>
                  </div>
                  
                  <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                    <h4 className="font-medium">Integration Note:</h4>
                    <p>The service provides the same interface as the original AIService, making it a drop-in replacement
                    that uses the typed API client internally. This approach minimizes changes to existing code while
                    improving type safety.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="hook" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>React Hook Usage</CardTitle>
                  <CardDescription>
                    Use the useAIQuery hook for simplified state management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/20 rounded-md p-4 mb-4">
                    <pre className="text-sm">
                      {`import { useAIQuery } from '@/hooks/useAIQuery';
import { AIQueryRequest } from '@/types/api-types';

// In your component:
function MyComponent() {
  const { response, isLoading, error, executeQuery } = useAIQuery();
  
  const handleSubmit = async () => {
    const request: AIQueryRequest = {
      query: "My question",
      client_id: clientId,
      use_rag: true
    };
    
    await executeQuery(request);
  };
  
  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {response && <p>Response: {response.response}</p>}
    </div>
  );
}`}
                    </pre>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Live Example:</h3>
                    <AIHookDemo clientId={clientId} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
} 