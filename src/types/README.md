# API TypeScript Types

This directory contains TypeScript type definitions for the AI Law Assistant API.

## Generated Types

The `api-types.ts` file contains auto-generated TypeScript interfaces that match the FastAPI/Pydantic models from the backend. 

**DO NOT EDIT THIS FILE MANUALLY** as it will be overwritten when types are regenerated.

## How to Generate Types

To regenerate the TypeScript types from the FastAPI OpenAPI schema, run:

```bash
# From the frontend directory:
npm run generate-types

# Or directly from the backend directory:
python scripts/generate_typescript_types.py
```

## Type Safety Benefits

Using these generated types provides several benefits:
- Ensures the frontend is using the correct data structures when communicating with the API
- Provides autocomplete for API request/response objects in your IDE
- Catches type errors at compile time rather than runtime
- Makes refactoring safer when API models change

## Example Usage

```typescript
import { AIQueryRequest, AIResponse } from '../types/api-types';

// Type-safe request object
const request: AIQueryRequest = {
  query: "What are the key provisions in this contract?",
  client_id: "123",
  documents: ["doc-456"],
  use_rag: true
};

// Make API call with type-safe request and response
async function queryAPI() {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  // Response is typed
  const data: AIResponse = await response.json();
  
  // TypeScript knows the shape of the response
  console.log(data.response);
  console.log(data.token_usage?.total_tokens);
} 