# Frontend Logging Guidelines

This document describes best practices for logging in the frontend application. By following these guidelines, you'll ensure consistent and useful logs that can be used for debugging, monitoring, and analytics.

## Table of Contents

1. [Logging Utility Overview](#logging-utility-overview)
2. [When to Log](#when-to-log)
3. [Logging Levels](#logging-levels)
4. [Structured Logging](#structured-logging)
5. [Examples](#examples)
6. [Integration with Backend](#integration-with-backend)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

## Logging Utility Overview

Our application uses a centralized logging utility in `frontend/src/utils/logger.ts`. This utility provides several benefits:

- Consistent logging interface across the application
- Automatic sending of logs to the backend in production
- Configurable verbosity based on environment
- Proper error formatting and serialization
- Throttling to prevent log floods
- Batching to reduce API calls

## When to Log

Log events that are useful for:

1. **Debugging**: Record state transitions, important function calls, or conditional branch decisions
2. **Monitoring**: Track user actions, API calls, performance metrics
3. **Analytics**: Record business-relevant events (conversions, feature usage)
4. **Error tracking**: Capture failures and exceptions with relevant context

**Do log:**
- Application startup and initialization
- Key user interactions (login, logout, major feature usage)
- API calls and responses (success/failure)
- State transitions
- Errors and exceptions
- Performance metrics for slow operations

**Don't log:**
- Sensitive user data (PII, passwords, authentication tokens)
- High-frequency events that would create log spam
- Redundant information that doesn't add value
- Very low-level details in production (use debug logs instead)

## Logging Levels

The logger utility provides three logging levels:

### `logger.info(message, options)`

Use for general information that's useful for tracking normal application flow.

```typescript
logger.info("Document loaded successfully", { 
  service: "documentService",
  metadata: { documentId: "123", size: "250KB" } 
});
```

### `logger.warn(message, options)`

Use for potentially problematic situations that don't prevent the application from working.

```typescript
logger.warn("API response was slow", {
  service: "apiService",
  metadata: { 
    endpoint: "/api/documents", 
    responseTime: 3500,  // milliseconds
    threshold: 2000      // expected maximum
  }
});
```

### `logger.error(message, error, options)`

Use for errors that prevent a function or feature from working correctly.

```typescript
try {
  // code that might throw
} catch (error) {
  logger.error("Failed to fetch user data", error, {
    service: "userService",
    metadata: { 
      userId: "123", 
      endpoint: "/api/users" 
    }
  });
}
```

### Special Purpose Logging

For specific types of events, use the dedicated methods:

#### API Call Logging

```typescript
logger.apiCall(request, response, {
  service: "apiService",
  action: "fetchDocuments",
  clientId: "user-123"
});
```

#### Token Usage Logging (for AI operations)

```typescript
logger.tokenUsage(
  "client-123",         // client ID
  "document-analysis",  // operation name
  tokenUsageObject,     // { prompt_tokens, completion_tokens, total_tokens }
  0.05                  // cost in dollars
);
```

## Structured Logging

Always use structured logging with proper context. Each log should include:

1. **Service/component name**: Identifies which part of the application generated the log
2. **Action**: What action was being performed
3. **Message**: Human-readable description of what happened
4. **Metadata**: Relevant structured data about the event
5. **Client ID**: When available, include the user/client identifier

### Log Options Object

The options object has the following properties:

```typescript
interface LogOptions {
  service?: string;       // Required: Component/service name
  action?: string;        // What action was being performed
  metadata?: Record<string, any>; // Structured data relevant to the event
  clientId?: string;      // User/client identifier
  sendToServer?: boolean; // Whether to send to backend
}
```

## Examples

### User Authentication

```typescript
// Successful login
logger.info("User logged in successfully", {
  service: "authService",
  action: "login",
  metadata: { 
    userId: "user-123",
    loginMethod: "email" 
  },
  clientId: "user-123"
});

// Failed login
logger.warn("Failed login attempt", {
  service: "authService",
  action: "login",
  metadata: { 
    email: "u***@example.com", // Redacted for privacy
    reason: "invalid_password",
    attempts: 3
  }
});
```

### API Requests

```typescript
// Before making request
logger.info("Fetching documents", {
  service: "documentService",
  action: "fetchDocuments",
  metadata: { 
    filters: { status: "active", category: "legal" },
    page: 1, 
    limit: 20 
  },
  clientId: "user-123"
});

// After successful response
logger.info("Documents fetched successfully", {
  service: "documentService",
  action: "fetchDocuments",
  metadata: { 
    count: 15,
    totalPages: 3,
    responseTime: 250 // ms
  },
  clientId: "user-123"
});

// Error handling
try {
  // API call code
} catch (error) {
  logger.error("Failed to fetch documents", error, {
    service: "documentService",
    action: "fetchDocuments",
    metadata: { 
      filters: { status: "active", category: "legal" },
      attempt: 2
    },
    clientId: "user-123"
  });
}
```

### Component Lifecycle

```typescript
// Component mounting
logger.info("Document viewer mounted", {
  service: "documentViewer",
  action: "mount",
  metadata: { 
    documentId: "doc-123",
    pageCount: 10
  }
});

// State changes
logger.info("Document view state changed", {
  service: "documentViewer",
  action: "stateChange",
  metadata: { 
    previousPage: 1,
    currentPage: 2,
    zoom: 1.5
  }
});
```

## Integration with Backend

Logs are automatically sent to the backend API in these cases:

1. All error logs (regardless of environment)
2. All warning logs (regardless of environment)
3. Info logs in production environments
4. Info logs in development when `sendToServer: true` is explicitly set

The backend processes these logs through the `/api/log` endpoint and writes them to structured log files that can be analyzed for monitoring, debugging, and analytics.

## Performance Considerations

The logging system includes several optimizations:

1. **Throttling**: Repetitive logs from the same service+action are throttled to prevent flooding
2. **Batching**: Logs are batched and sent in groups to reduce API calls
3. **Selective sending**: In development, only warnings and errors are sent to the backend by default

## Troubleshooting

If you're not seeing logs:

1. Check browser console for any errors in the logging system
2. Verify network tab for API calls to `/api/log` and `/api/logs/batch`
3. Ensure the backend logging API is working properly
4. In development, remember that info logs appear in console but aren't sent to backend by default

For log processing issues:

1. Check backend logs for any errors in the logging routes
2. Verify that logs are being written to the correct files
3. Check disk space if log files aren't being created

---

By following these guidelines, you'll create consistent, useful logs that make debugging, monitoring, and analysis much easier across the application. 