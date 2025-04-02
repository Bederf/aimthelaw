# API Client

This directory contains the API client for interacting with the AI Law Assistant backend.

## Overview

The API client provides a type-safe interface for making requests to the backend API. It uses the TypeScript types generated from the FastAPI OpenAPI schema.

## How It Works

1. The `apiClient.ts` file contains a generic API request function and type-safe methods for each API endpoint
2. The client imports the TypeScript types generated from the FastAPI OpenAPI schema
3. This ensures that your requests and responses match what the backend expects

## Usage Example

```typescript
import apiClient from './apiClient';
import { AIQueryRequest, AIResponse } from '../types/api-types';

// Create a type-safe request
const queryRequest: AIQueryRequest = {
  query: "Analyze this contract for potential risks",
  client_id: "client-123",
  documents: ["doc-456"],
  use_rag: true
};

// Make the API call with type safety
async function analyzeDocument() {
  try {
    const result = await apiClient.queryAI<AIQueryRequest, AIResponse>(queryRequest);
    
    // TypeScript knows the shape of the response
    console.log(result.response);
    
    if (result.token_usage) {
      console.log(`Used ${result.token_usage.total_tokens} tokens`);
    }
    
    return result;
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
}
```

## Setup Process

1. Generate the TypeScript types from the FastAPI schema:
   ```bash
   npm run generate-types
   ```

2. Uncomment the import statement in `apiClient.ts`:
   ```typescript
   import { AIQueryRequest, AIResponse, DateExtractionRequest, DateExtractionResponse } from '../types/api-types';
   ```

3. Update the client methods to use the specific types:
   ```typescript
   async queryAI(requestData: AIQueryRequest): Promise<AIResponse> {
     return apiRequest<AIQueryRequest, AIResponse>('/api/ai/query', 'POST', requestData);
   }
   ```

## Benefits

- **Type Safety**: Catch errors at compile time rather than runtime
- **IntelliSense**: Get autocomplete for API request and response structures
- **Self-Documentation**: The types serve as documentation for what data the API expects
- **Refactoring Safety**: When the API changes, the TypeScript compiler will catch incompatible usage 