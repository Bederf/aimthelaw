# Quick Actions Troubleshooting Guide

## Summary of Issues

We've identified several issues with the Quick Actions functionality in the AI Lawyer feature:

1. **Missing File Selection UI**: The sidebar that should display selectable documents is not visible on the AI Lawyer page, preventing users from selecting documents.

2. **Disabled Quick Action Buttons**: All four Quick Action buttons ("Extract Dates", "Summarize Document", "Reply to Letter", "Prepare for Court") are disabled because there are no selected documents.

3. **Backend Communication Gap**: While the session storage mechanism for storing selected document IDs works internally, the document IDs aren't being sent to the backend due to UI rendering issues.

## Root Causes

1. **Conditional Rendering Issues**: The file selection UI in the `AILawyerPageNew.tsx` component is likely not rendering due to conditional logic that's not being satisfied.

2. **Document Selection Encapsulation**: The `toggleDocumentSelection` function works correctly but isn't accessible from the UI because the document selection components aren't rendered.

3. **Session Storage Mechanism**: Selected document IDs are stored in session storage under the key `selected_documents`, but this data isn't being passed to API calls due to the UI issues.

## Diagnostic Files Created

We've created several diagnostic tools and reference files to help debug and fix the issues:

1. **[quick-actions-fix-recommendations.md](./quick-actions-fix-recommendations.md)**: Detailed recommendations for fixing the UI rendering issues.

2. **[backend-communication-reference.md](./backend-communication-reference.md)**: Guide to how document IDs should be sent to the backend APIs.

3. **[quick-actions-debugging-patch.ts](./quick-actions-debugging-patch.ts)**: JavaScript tools that can be pasted into browser console to expose internal functions and create a temporary UI.

4. **[quick-actions-backend-test.spec.ts](./quick-actions-backend-test.spec.ts)**: Specialized Playwright test that validates backend communication for Quick Actions.

## Immediate Solutions for Testing

To immediately test the Quick Actions functionality without fixing the underlying issues:

1. **Use Browser Console Debugging Tools**:
   ```javascript
   // Paste this into your browser console when on the AI Lawyer page
   // This code is from quick-actions-debugging-patch.ts
   function exposeQuickActionFunctions() {
     // Find the React instance
     const reactInstance = Object.values(document.querySelector('[id^="root"]')?.__reactFiber$ || {})
       .find((value) => value && value.memoizedState && value.memoizedState.element);
     
     // ... additional code, see quick-actions-debugging-patch.ts
   }
   
   // Expose functions
   exposeQuickActionFunctions();
   
   // Add test document ID to session storage
   sessionStorage.setItem('selected_documents', JSON.stringify(["02a754f2-92fe-4742-a90a-6c577118ab4b"]));
   
   // Trigger a Quick Action
   (window).handleQuickAction('extract_dates');
   ```

2. **Create Debug UI**:
   ```javascript
   // Create a debug panel for easier testing
   createDebugUi();
   ```

## Long-term Fixes Required

### 1. Fix File Selection UI Rendering

Review and fix the conditional rendering logic in `AILawyerPageNew.tsx`:

```typescript
// Look for code similar to this and ensure conditions are correctly evaluated
{shouldShowSidebar && (
  <ClientDocumentsPanel
    clientId={clientId}
    toggleDocumentSelection={toggleDocumentSelection}
    selectedDocuments={selectedDocuments}
  />
)}
```

### 2. Ensure Backend API Integration

Make sure the `handleQuickAction` function in `AILawyerPageNew.tsx` correctly:
1. Reads selected document IDs from session storage
2. Includes these IDs in API calls
3. Handles responses appropriately

### 3. Add Error Handling and Diagnostics

Add error handling to display meaningful error messages when:
- Document selection fails
- UI components fail to render
- API calls fail

## Testing Your Fixes

After implementing fixes, you can test them using:

1. **Manual Testing**:
   - Navigate to the AI Lawyer page
   - Select a document from the sidebar
   - Verify that Quick Action buttons become enabled
   - Click a Quick Action button
   - Monitor network requests to ensure document IDs are sent

2. **Automated Testing**:
   - Run the specialized backend communication test:
   ```bash
   cd ~/law/ai-law/frontend
   npx playwright test tests/quick-actions-backend-test.spec.ts --headed
   ```

## Next Steps

1. **Review AILawyerPageNew.tsx**: Focus on the conditional rendering logic for the sidebar.
2. **Check API Client Logic**: Ensure the API client correctly formats requests with document IDs.
3. **Add Error Boundaries**: Add React error boundaries to prevent entire component failures.
4. **Improve Logging**: Add more detailed logging to help diagnose issues in production.

## Contact

If you have questions about these recommendations or need assistance implementing them, please contact the developers who worked on this diagnostic effort.

**Last Updated**: June 2023 