# Backend Communication Reference: Quick Actions

This document provides detailed guidance on how document IDs should be sent to the backend when using Quick Actions in the AI Lawyer application.

## Current Implementation

Based on our console logs and investigation:

1. **Document Selection Process**:
   ```
   [toggleDocumentSelection] Toggle selection for document ID: 02a754f2-92fe-4742-a90a-6c577118ab4b
   [toggleDocumentSelection] Selected document, saved 1 files to session storage
   ```

2. **Session Storage Mechanism**:
   - Selected document IDs are stored in session storage under the key `selected_documents`
   - When documents are selected/deselected, this storage is updated

3. **Quick Action Handler**:
   - The `handleQuickAction` function should read selected documents from session storage
   - These document IDs should be sent to the backend via API calls

## Expected API Request Format

When calling the backend API for Quick Actions, the request should follow this format:

### Extract Dates API Call

```typescript
// API Request Format
{
  "documentIds": ["02a754f2-92fe-4742-a90a-6c577118ab4b"], // Array of selected document IDs
  "model": "gpt-4",                                        // AI model to use
  "options": {                                             // Optional parameters
    "isQuickAction": true
  }
}
```

### Implementation in ConsolidatedAIService

The `ConsolidatedAIService` class should handle sending document IDs to the backend:

```typescript
// In consolidatedAIService.ts

// Example for Extract Dates
async extractDates(documentIds: string[], model: string = 'gpt-4', options: AIProcessingOptions = {}): Promise<any> {
  if (!documentIds || documentIds.length === 0) {
    throw new Error('No documents selected for Extract Dates action');
  }
  
  const requestId = this.generateRequestId();
  
  try {
    const mergedOptions: AIProcessingOptions = {
      isQuickAction: true,  // Mark this as a quick action
      ...options
    };
    
    // Set up progress tracking
    if (mergedOptions.progressCallback) {
      mergedOptions.progressCallback({
        state: ProcessState.INITIALIZING
      });
    }
    
    // Prepare API request payload
    const payload = {
      requestId,
      documentIds,  // This is the critical field that must be included
      model,
      options: mergedOptions
    };
    
    // Make API request
    const response = await fetch(`${this.apiUrl}/ai/extract-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in extractDates:', error);
    throw error;
  }
}
```

## How handleQuickAction Should Send Document IDs

The `handleQuickAction` function in `AILawyerPageNew.tsx` should:

1. Get selected document IDs from session storage
2. Pass these IDs to the appropriate service method
3. Handle the response

```typescript
// In AILawyerPageNew.tsx

const handleQuickAction = async (action: string) => {
  // Get selected documents from session storage
  const selectedDocIds = JSON.parse(sessionStorage.getItem('selected_documents') || '[]');
  
  if (!selectedDocIds || selectedDocIds.length === 0) {
    setError('Please select at least one document to perform this action.');
    return;
  }
  
  setQuickActionLoading(action);
  
  try {
    let response;
    
    // Different API calls based on action type
    switch (action) {
      case 'extract_dates':
        response = await aiService.extractDates(selectedDocIds, selectedModel);
        break;
      case 'summarize_document':
        response = await aiService.generateLegalSummary(selectedDocIds, selectedModel);
        break;
      case 'reply_to_letter':
        if (selectedDocIds.length > 1) {
          setError('Reply to Letter can only be used with a single document.');
          setQuickActionLoading(null);
          return;
        }
        response = await aiService.replyToLetter(selectedDocIds, selectedModel);
        break;
      case 'prepare_for_court':
        response = await aiService.prepareCourt(selectedDocIds, selectedModel);
        break;
      default:
        setError(`Unknown quick action: ${action}`);
        setQuickActionLoading(null);
        return;
    }
    
    // Process response...
    
  } catch (error) {
    console.error(`Error in quick action ${action}:`, error);
    setError(`Error performing ${action}: ${error.message}`);
  } finally {
    setQuickActionLoading(null);
  }
};
```

## Debugging Backend Communication

When document IDs aren't being sent to the backend, follow these steps:

1. **Check Session Storage**:
   ```javascript
   // In browser console
   console.log('Selected documents:', JSON.parse(sessionStorage.getItem('selected_documents') || '[]'));
   ```

2. **Verify API Request Payload**:
   - Use browser developer tools Network tab
   - Filter for requests to `/ai/` endpoints
   - Verify the `documentIds` field is present in the request payload

3. **Add Request Logging**:
   ```typescript
   // In handleQuickAction function
   console.log(`Quick Action ${action} triggered with document IDs:`, selectedDocIds);
   
   // In service methods
   console.log(`API call for ${action} with document IDs:`, documentIds);
   ```

## Example Network Request

A successful API request to the backend should look like:

```
POST /api/ai/extract-dates HTTP/1.1
Host: api.legal-ai-system.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "requestId": "req_a8b9c7d6e5f4",
  "documentIds": ["02a754f2-92fe-4742-a90a-6c577118ab4b"],
  "model": "gpt-4",
  "options": {
    "isQuickAction": true,
    "progressCallback": null
  }
}
```

## Common Issues and Solutions

1. **Document IDs not in request**:
   - Verify that `toggleDocumentSelection` is correctly updating session storage
   - Ensure `handleQuickAction` is reading from session storage

2. **API returns 400 Bad Request**:
   - Check that document IDs are in the correct format (array of strings)
   - Verify all required fields are included in the request

3. **API returns 401 Unauthorized**:
   - Ensure the access token is current and valid
   - Check that `getAccessToken()` method is working

4. **API times out**:
   - Check that the backend service is running
   - Verify the document IDs exist in the backend database

5. **UI doesn't update after API call**:
   - Make sure response handling in the component correctly processes the API response
   - Check that state updates trigger re-rendering

## Testing Backend Connectivity

To test that document IDs are correctly sent to the backend:

1. **Unit Test**:
   ```typescript
   test('handleQuickAction sends correct document IDs to backend', async () => {
     // Mock session storage
     window.sessionStorage.setItem('selected_documents', JSON.stringify(['test-doc-1', 'test-doc-2']));
     
     // Mock aiService method
     const mockExtractDates = jest.fn().mockResolvedValue({ success: true });
     mockAiService.extractDates = mockExtractDates;
     
     // Call the function
     await handleQuickAction('extract_dates');
     
     // Verify correct document IDs were sent
     expect(mockExtractDates).toHaveBeenCalledWith(
       ['test-doc-1', 'test-doc-2'],
       expect.any(String),
       expect.any(Object)
     );
   });
   ```

2. **E2E Test**:
   ```typescript
   test('End-to-end Extract Dates with document ID', async ({ page }) => {
     // Login and navigate
     await login(page);
     await page.goto('/lawyer/ai/client-id');
     
     // Inject document ID to session storage
     await page.evaluate(() => {
       sessionStorage.setItem('selected_documents', JSON.stringify(['test-doc-id']));
       // Call handleQuickAction if accessible
       if (typeof (window as any).handleQuickAction === 'function') {
         (window as any).handleQuickAction('extract_dates');
       }
     });
     
     // Wait for API response
     // Verify UI updates
   });
   ```

Remember, the key to fixing the backend communication issue is ensuring that document IDs from session storage are correctly passed to the backend API through the appropriate service methods. The main challenge is accessing the selected documents in the application flow, as the UI for document selection is currently missing. 