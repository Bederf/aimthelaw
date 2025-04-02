# API Client Integration

This document provides an overview of how our typed API client has been integrated into the application, with multiple options to fit different use cases.

## Integration Options

We've provided several ways to use the API client, allowing for both gradual adoption and immediate benefits:

### 1. Direct API Client Usage

The simplest approach is to import the API client directly in your components:

```typescript
import { apiClient } from '@/api/apiClient';
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
};
```

### 2. ModernAIService

For a drop-in replacement of the existing AIService with minimal code changes:

```typescript
import { ModernAIService } from '@/services/modernAIService';

// Initialize the service (same constructor signature as AIService)
const aiService = new ModernAIService(clientId);

// Use the same methods as the original AIService
const response = await aiService.sendMessage(
  "My question",
  [], // documentIds
  "gpt-4", // model
  null, // conversationId
  [] // previousMessages
);
```

### 3. React Hook Usage

For React components, we provide a custom hook that manages loading and error states:

```typescript
import { useAIQuery } from '@/hooks/useAIQuery';
import { AIQueryRequest } from '@/types/api-types';

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
}
```

## Implementation Details

### API Client

The API client (`apiClient.ts`) provides a type-safe interface to the backend API endpoints. It:

- Uses TypeScript types generated from the FastAPI schema
- Handles authentication tokens automatically
- Provides consistent error handling
- Implements all API endpoints with proper types

### ModernAIService

The ModernAIService (`modernAIService.ts`) is a drop-in replacement for the existing AIService that:

- Maintains the same interface as the original service
- Uses the typed API client internally
- Provides better error handling and logging
- Ensures type safety for requests and responses

### React Hook

The `useAIQuery` hook (`useAIQuery.ts`) simplifies state management for API calls by:

- Managing loading and error states
- Providing a simple interface for executing queries
- Supporting TypeScript for auto-completion and type checking
- Making components cleaner and more focused

## Type Generation

The TypeScript types are generated from the FastAPI schema using a script:

```bash
npm run generate-types
```

This creates or updates the `frontend/src/types/api-types.ts` file with interfaces matching the backend API models.

## Example Components

We've created several example components to demonstrate these integration options:

1. `AIExampleComponent.tsx` - Shows direct API client usage
2. `AIHookDemo.tsx` - Demonstrates the useAIQuery hook
3. `APIClientUsagePage.tsx` - A documentation page showing all approaches

## Migration Strategy

To migrate existing code, we recommend:

1. Start with the ModernAIService for components heavily using AIService
2. Use the direct API client approach for new features
3. Consider the React hook for components with complex state management

This allows for incremental adoption of the typed API client throughout the application. 