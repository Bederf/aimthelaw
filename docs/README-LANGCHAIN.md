# Langchain Memory Integration

This document provides instructions for setting up and using the Langchain memory integration in the AI Law application.

## Overview

The Langchain memory integration allows the AI assistant to maintain conversation history and generate summaries of conversations. This is implemented using:

1. Database tables for storing conversations and messages
2. A Langchain service for processing messages and generating summaries
3. Integration with the AI Lawyer page for a seamless user experience

## Database Setup

The application uses two main tables:

- `conversations`: Stores metadata about each conversation, linked to a client
- `conversation_messages`: Stores individual messages within conversations

To set up these tables, run the migration:

```bash
cd frontend
npx supabase migration up
```

## Service Integration

The Langchain integration is implemented through the `LangchainService` class, which provides methods for:

- Processing messages with conversation memory
- Generating conversation summaries
- Retrieving conversation history

## Usage in the Application

The AI Lawyer page uses the Langchain integration to:

1. Store all messages in the database
2. Automatically generate summaries after every 5 messages
3. Load conversation history when returning to a previous conversation

## API Endpoints

The backend should implement the following endpoints:

- `POST /ai/langchain/chat`: Process a message using Langchain with memory
- `POST /ai/langchain/summarize`: Generate a summary of a conversation

## Troubleshooting

If you encounter database relationship errors, ensure that:
- The `conversations` table correctly references the `clients` table
- The `conversation_messages` table correctly references the `conversations` table
- The `lawyer_clients` table contains the correct relationships between lawyers and clients

## Security

The database tables implement Row Level Security (RLS) policies to ensure:

- Lawyers can only access conversations for their clients
- Lawyers can only insert messages into conversations for their clients
- All data is properly secured and isolated based on the lawyer-client relationship 