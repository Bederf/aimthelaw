# Quick Actions Implementation Guide

This guide provides step-by-step instructions to fix the Quick Actions functionality in the AI Lawyer feature.

## Step 1: Add Debugging Helpers

First, add debugging tools to help diagnose the issue:

```typescript
// In AILawyerPageNew.tsx, add this useEffect hook
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    // Expose key functions and state for debugging
    window.debugAILawyer = {
      toggleDocumentSelection,
      handleQuickAction,
      getSelectedDocuments: () => JSON.parse(sessionStorage.getItem('selected_documents') || '[]'),
      state: {
        clientId,
        selectedDocuments,
        shouldShowSidebar,
        clientDocuments
      }
    };
    
    console.log('AI Lawyer debugging functions exposed to window.debugAILawyer');
    console.log('Client ID:', clientId);
    console.log('Should show sidebar:', shouldShowSidebar);
  }
}, [clientId, selectedDocuments, shouldShowSidebar, clientDocuments]);
```

## Step 2: Fix Conditional Rendering Logic

Fix the conditional rendering issue that's preventing the document selection UI from appearing:

```typescript
// Find this section in AILawyerPageNew.tsx
{shouldShowSidebar && (
  <ClientDocumentsPanel
    clientId={clientId}
    toggleDocumentSelection={toggleDocumentSelection}
    selectedDocuments={selectedDocuments}
  />
)}

// MODIFY to ensure sidebar shows:
const sidebarShouldRender = Boolean(clientId);
console.log('Sidebar rendering condition:', { 
  sidebarShouldRender, 
  clientId
});

// Then use the variable in rendering, with a fallback for debugging
{(sidebarShouldRender || process.env.NODE_ENV === 'development') && (
  <ClientDocumentsPanel
    clientId={clientId || 'debug-client-id'} // Provide fallback for development
    toggleDocumentSelection={toggleDocumentSelection}
    selectedDocuments={selectedDocuments}
  />
)}
```

## Step 3: Fix Document Selection Storage Logic

Ensure proper integration between document selection and session storage:

```typescript
// Find the toggleDocumentSelection function
const toggleDocumentSelection = (documentId: string) => {
  console.log(`[toggleDocumentSelection] Toggle selection for document ID: ${documentId}`);
  
  // Get current selection from state
  const currentSelection = [...selectedDocuments];
  
  // Toggle selection
  const documentIndex = currentSelection.indexOf(documentId);
  if (documentIndex === -1) {
    currentSelection.push(documentId);
  } else {
    currentSelection.splice(documentIndex, 1);
  }
  
  // Update state
  setSelectedDocuments(currentSelection);
  
  // Update session storage
  sessionStorage.setItem('selected_documents', JSON.stringify(currentSelection));
  console.log(`[toggleDocumentSelection] Saved ${currentSelection.length} files to session storage`);
  
  // Force re-evaluation of quick action button disabled state
  updateQuickActionButtonsState(currentSelection);
};
```

## Step 4: Fix Quick Action Handler Function

Update the `handleQuickAction` function to properly read from session storage:

```typescript
// Find the handleQuickAction function
const handleQuickAction = async (action: string) => {
  console.log(`[handleQuickAction] Action triggered: ${action}`);
  
  // Get selected documents from state AND session storage (as backup)
  let docIds = selectedDocuments;
  
  // If no documents in state, try session storage as backup
  if (!docIds || docIds.length === 0) {
    const sessionDocIds = JSON.parse(sessionStorage.getItem('selected_documents') || '[]');
    if (sessionDocIds.length > 0) {
      console.log(`[handleQuickAction] Using document IDs from session storage`);
      docIds = sessionDocIds;
    }
  }
  
  console.log(`[handleQuickAction] Using document IDs:`, docIds);
  
  // Validate we have documents
  if (!docIds || docIds.length === 0) {
    const errorMsg = 'Please select at least one document to perform this action.';
    setError(errorMsg);
    return;
  }
  
  setQuickActionLoading(action);
  
  try {
    let response;
    
    // Different API calls based on action type
    switch (action) {
      case 'extract_dates':
        response = await aiService.extractDates(docIds, selectedModel);
        break;
      case 'summarize_document':
        response = await aiService.generateLegalSummary(docIds, selectedModel);
        break;
      // other cases...
    }
    
    // Process response...
    
  } catch (error) {
    console.error(`[handleQuickAction] Error:`, error);
    setError(`Error performing ${action}: ${error.message}`);
  } finally {
    setQuickActionLoading(null);
  }
};
```

## Step 5: Improve User Feedback for Quick Actions

Add clear UI feedback to help users understand why buttons might be disabled:

```tsx
<div className="quick-actions-container">
  <h3>Quick Actions</h3>
  
  <div className="action-buttons">
    <Button 
      onClick={() => handleQuickAction("extract_dates")} 
      disabled={!hasSelectedDocuments || quickActionLoading}
    >
      {quickActionLoading === "extract_dates" ? "Processing..." : "Extract Dates"}
    </Button>
    
    {/* Add similar buttons for other actions */}
  </div>
  
  {!hasSelectedDocuments && (
    <div className="text-sm text-amber-500 mt-2">
      Please select one or more documents from the sidebar to enable quick actions.
    </div>
  )}
</div>
```

## Step 6: Verify Solution with Tests

Use the provided test files to validate your fixes:

1. Run our specialized backend test:
   ```bash
   cd ~/law/ai-law/frontend
   npx playwright test tests/quick-actions-backend-test.spec.ts --headed
   ```

2. Use the browser console debugging tools:
   ```javascript
   // In browser console
   window.debugAILawyer.state
   window.debugAILawyer.getSelectedDocuments()
   
   // Select a document
   window.debugAILawyer.toggleDocumentSelection("your-document-id")
   
   // Trigger an action
   window.debugAILawyer.handleQuickAction("extract_dates")
   ```

## Using Our Debugging Utility

For more advanced debugging, use our debugging utility:

```javascript
// In browser console
// Paste the content of quick-actions-debugging-patch.ts
// Then run:
exposeQuickActionFunctions();
createDebugUi();
```

This will add a debug panel to help with diagnosis and testing.

## Summary of Key Points

1. Fix document selection UI rendering in the sidebar
2. Ensure proper session storage integration
3. Update Quick Action handler to read from session storage
4. Add clear error messages and UI feedback
5. Monitor API calls to confirm document IDs are sent correctly

The root issue appears to be that the document selection UI is not rendering due to conditional logic, which prevents users from selecting documents, leading to permanently disabled Quick Action buttons. 