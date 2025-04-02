# AI Law Token System

## Overview

The AI Law application implements a token system to track and manage API usage for AI interactions. This document explains how the token system works, how it's integrated into the application, and how to troubleshoot common issues.

## Token Usage Tracking

### What are Tokens?

In the context of AI models like GPT-4, tokens are the basic units of text processing. Each word typically consists of 1-4 tokens, depending on its length and complexity. The application tracks:

1. **Input tokens**: Tokens used in user messages and context
2. **Output tokens**: Tokens generated in AI responses
3. **Total tokens**: The sum of input and output tokens

### Token Storage

Token usage is stored in:

1. The `token_usage` field in the `conversation_messages` table (as JSONB)
2. Potentially in a separate token tracking table (if implemented)

## Implementation

### Token Service

The application includes a `tokenService` that provides methods for:

- Getting token usage information for a user
- Tracking token usage over time
- Potentially enforcing token limits

```typescript
// Example token service usage
const tokenInfo = await tokenService.getTokenInfo(userId);
console.log(`Used tokens: ${tokenInfo.used}`);
```

### Token Usage in API Calls

When making AI API calls, the application:

1. Sends the request to the AI service
2. Receives a response that includes token usage information
3. Stores this information in the database
4. Updates the user's token usage metrics

## Troubleshooting

### Common Issues

1. **Missing Token Information**: If token usage isn't being tracked, check:
   - The AI service response format
   - The database schema for the `token_usage` field
   - The token service implementation

2. **Error: getAccessToken is not a function**: This occurs when the authentication method is missing or improperly implemented. Ensure the `AIService` class has a properly implemented `getAccessToken` method.

3. **406 HTTP Errors**: These typically indicate an issue with the Accept header in requests or response format issues. Check the API endpoint implementation.

## Token Usage Monitoring

The application may include features for:

- Displaying token usage to users
- Setting token usage limits
- Alerting when approaching token limits
- Reporting on token usage over time

## Integration with Billing

If the application includes a billing system, token usage can be used to:

- Calculate costs based on token consumption
- Generate invoices for users
- Implement tiered pricing based on usage levels

## Future Enhancements

Potential improvements to the token system:

1. Real-time token usage display
2. Token usage predictions
3. Token optimization suggestions
4. Token usage analytics dashboard 