# Backend Architecture Guide

This document outlines the architecture of our existing backend system to ensure that frontend improvements remain compatible with our API structure.

## Technology Stack

Our backend uses the following technologies:
- **FastAPI** (Python 3.9+): Primary web framework for API endpoints
- **PostgreSQL/Supabase**: Database with vector capabilities
- **OpenAI**: Integration for AI features like text generation, document analysis, etc.

## API Structure

### Authentication Endpoints

Our authentication system is built on Supabase Authentication:

- **Login**: Frontend uses Supabase client for authentication
- **User Management**: Handled through Supabase
- **Role-based Access**: Support for lawyer, client, and admin roles

### AI Integration Endpoints

Our system has several AI-powered features, with these key endpoints:

#### Unified AI Routes (`/api/routes/ai_unified_routes.py`)

- **GET `/models`**: Returns available AI models
- **POST `/create-conversation`**: Creates a new conversation with optional metadata
- **POST `/query`**: Processes a regular AI query
- **POST `/stream_query`**: Processes a streaming AI query for real-time responses
- **POST `/extract-insights`**: Extracts insights from documents
- **POST `/extract-dates`**: Extracts dates from documents with optional calendar integration
- **POST `/summarize`**: Generates summaries of documents
- **POST `/reply-to-letter`**: Generates replies to legal letters
- **POST `/prepare-for-court`**: Analyzes documents for court preparation
- **POST `/quick-action`**: Executes predefined quick actions on documents
- **POST `/process`**: Generic processing endpoint for AI actions

#### Document Services

Our document services handle storage, retrieval, and processing:

- **Document Retrieval**: Functions to get document content, metadata, and chunks
- **Letter Reply Service**: Specialized service for analyzing legal letters and generating responses
- **Date Extraction Service**: Extracts important dates from legal documents

## Data Models

### Key Models

- **User**: Authenticated user with role information
- **Client**: Client information with associated lawyer
- **Document**: Legal documents with metadata, content, and vector embeddings
- **Conversation**: Chat conversations between users and AI
- **Message**: Individual messages within conversations
- **Token Usage**: Tracking of API token usage

## Frontend-Backend Integration

### API Client

The frontend uses a centralized API client (`apiClient.ts`) that handles:

- Request formatting and type safety
- Error handling
- Authentication token management
- Retry logic for failed requests

### Context Providers

Key context providers that interact with the backend:

- **AILawyerContext**: Manages state for the AI lawyer interface
- **AuthContext**: Handles authentication state and user information

## Important Implementation Details

### Document Selection and Processing

The document selection system allows users to:
- Select multiple documents for AI processing
- Send documents to various AI endpoints based on the action required
- Track the status of document processing

### Token Tracking System

We implement a comprehensive token tracking system to:
- Monitor API usage
- Allocate tokens to different users/clients
- Track costs associated with API calls

### Quick Actions Implementation

Quick actions are predefined AI operations that can be executed with a single click:
- Extract Dates
- Summarize Document
- Reply to Letter
- Prepare for Court

Each quick action calls specific backend endpoints with appropriate parameters.

## API Response Formats

Our backend typically responds with a consistent JSON format:
```json
{
  "success": true|false,
  "data": { /* response data */ },
  "error": null|"error message"
}
```

For streaming responses, we use Server-Sent Events (SSE) with specific event types for different parts of the response.

## Common Pitfalls

When modifying the frontend, be aware of:

1. **Document Selection State**: The frontend tracks selected documents and sends IDs to the backend
2. **Conversation Context**: AI responses depend on conversation history maintained in the backend
3. **Authentication Headers**: All API requests require proper authentication headers
4. **Error Handling**: The frontend should handle various error states returned by the backend
5. **Streaming Responses**: For real-time AI features, the frontend uses event listeners for SSE

## Testing Backend Integration

When testing frontend changes:
1. Verify that document selection works correctly
2. Ensure that AI responses are properly displayed
3. Check that error states are handled gracefully
4. Validate that token usage information is correctly shown

---

This document provides a high-level overview of our backend architecture. For more detailed information, please refer to the backend code directly or ask specific questions about particular endpoints or features. 