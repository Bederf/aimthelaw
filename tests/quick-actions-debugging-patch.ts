/**
 * Quick Actions Debugging Patch
 * 
 * This file contains code snippets that can be pasted into the browser console
 * to expose and test internal document selection functionality.
 * 
 * USAGE: Copy sections of this file and paste them into the browser console
 * when viewing the AI Lawyer page to add debugging functionality.
 */

/**
 * ------------------------------------------------------------
 * SECTION 1: Expose Core Functions to Window Scope
 * ------------------------------------------------------------
 * These functions make internal functions accessible for testing
 */

/**
 * Function to expose internal functions to the window scope for debugging
 * Run this in the console first to expose helper functions
 */
function exposeQuickActionFunctions() {
  // Find the React instance
  const reactInstance = Object.values(document.querySelector('[id^="root"]')?.__reactFiber$ || {})
    .find((value: any) => value && value.memoizedState && value.memoizedState.element);

  if (!reactInstance) {
    console.error("❌ Could not find React instance. Make sure you're on the AI Lawyer page.");
    return false;
  }

  // Try to find the AILawyerPageNew component
  let aiLawyerComponent = null;
  const queue = [reactInstance];
  
  while (queue.length > 0 && !aiLawyerComponent) {
    const current = queue.shift();
    
    // Check if this is the AILawyerPageNew component
    if (current?.type?.name === 'AILawyerPageNew' || 
        (current?.memoizedProps && 
         Object.keys(current.memoizedProps).some(key => 
           ['handleQuickAction', 'toggleDocumentSelection'].includes(key)))) {
      aiLawyerComponent = current;
      break;
    }
    
    // Add child fibers to the queue
    if (current.child) queue.push(current.child);
    if (current.sibling) queue.push(current.sibling);
  }

  if (!aiLawyerComponent) {
    console.error("❌ Could not find AILawyerPageNew component.");
    return false;
  }

  // Try to extract the key functions
  try {
    // Extract functions from component props
    const props = aiLawyerComponent.memoizedProps || {};
    
    // Extract state and functions
    (window as any).aiLawyerState = aiLawyerComponent.memoizedState;
    
    // Find toggleDocumentSelection
    if (props.toggleDocumentSelection) {
      (window as any).toggleDocumentSelection = props.toggleDocumentSelection;
      console.log("✅ Exposed toggleDocumentSelection to window scope");
    } else {
      console.warn("⚠️ toggleDocumentSelection not found in component props");
    }
    
    // Find handleQuickAction
    if (props.handleQuickAction) {
      (window as any).handleQuickAction = props.handleQuickAction;
      console.log("✅ Exposed handleQuickAction to window scope");
    } else {
      console.warn("⚠️ handleQuickAction not found in component props");
    }
    
    // Add helper to check session storage
    (window as any).checkSelectedDocuments = () => {
      const docs = JSON.parse(sessionStorage.getItem('selected_documents') || '[]');
      console.log("📄 Selected documents:", docs);
      return docs;
    };
    console.log("✅ Added checkSelectedDocuments helper function");
    
    return true;
  } catch (error) {
    console.error("❌ Error exposing functions:", error);
    return false;
  }
}

/**
 * ------------------------------------------------------------
 * SECTION 2: Create Temporary UI for Testing
 * ------------------------------------------------------------
 * Adds a temporary UI panel for manual testing of document selection
 */

/**
 * Function to create a temporary UI for testing document selection
 */
function createDebugUi() {
  // Create debug panel
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: #1a1a1a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 15px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  `;
  
  panel.innerHTML = `
    <h3 style="margin-top: 0; color: #3b82f6; border-bottom: 1px solid #444; padding-bottom: 8px;">Quick Actions Debug</h3>
    
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Document ID:</label>
      <input type="text" id="document-id-input" placeholder="Enter document ID" style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px;">
    </div>
    
    <div style="margin-bottom: 15px;">
      <button id="toggle-selection-btn" style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Toggle Selection</button>
      <button id="check-selected-btn" style="background: #4b5563; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Check Selected</button>
    </div>
    
    <div style="margin-bottom: 15px; border-top: 1px solid #444; padding-top: 10px;">
      <p style="margin-bottom: 8px; font-weight: bold;">Quick Actions:</p>
      <button class="action-btn" data-action="extract_dates" style="background: #10b981; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">Extract Dates</button>
      <button class="action-btn" data-action="summarize_document" style="background: #6366f1; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">Summarize</button>
      <button class="action-btn" data-action="reply_to_letter" style="background: #f59e0b; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; margin-bottom: 5px;">Reply to Letter</button>
      <button class="action-btn" data-action="prepare_for_court" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 5px;">Prepare for Court</button>
    </div>
    
    <div id="debug-output" style="background: #2a2a2a; padding: 10px; border-radius: 4px; max-height: 100px; overflow-y: auto; font-family: monospace; font-size: 12px;">
      Debug panel initialized
    </div>
    
    <div style="margin-top: 10px; text-align: right;">
      <button id="close-debug-btn" style="background: #64748b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Close</button>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add event listeners
  document.getElementById('toggle-selection-btn')?.addEventListener('click', () => {
    const docId = (document.getElementById('document-id-input') as HTMLInputElement)?.value;
    if (!docId) {
      logToDebug('Please enter a document ID');
      return;
    }
    
    if (!(window as any).toggleDocumentSelection) {
      logToDebug('❌ toggleDocumentSelection not available. Run exposeQuickActionFunctions() first.');
      return;
    }
    
    try {
      (window as any).toggleDocumentSelection(docId);
      logToDebug(`Toggled selection for document ID: ${docId}`);
    } catch (error) {
      logToDebug(`❌ Error: ${error.message}`);
    }
  });
  
  document.getElementById('check-selected-btn')?.addEventListener('click', () => {
    if (!(window as any).checkSelectedDocuments) {
      logToDebug('❌ checkSelectedDocuments not available. Run exposeQuickActionFunctions() first.');
      return;
    }
    
    const docs = (window as any).checkSelectedDocuments();
    logToDebug(`Selected documents: ${JSON.stringify(docs)}`);
  });
  
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      
      if (!(window as any).handleQuickAction) {
        logToDebug('❌ handleQuickAction not available. Run exposeQuickActionFunctions() first.');
        return;
      }
      
      try {
        logToDebug(`Triggering Quick Action: ${action}`);
        (window as any).handleQuickAction(action);
      } catch (error) {
        logToDebug(`❌ Error: ${error.message}`);
      }
    });
  });
  
  document.getElementById('close-debug-btn')?.addEventListener('click', () => {
    document.getElementById('debug-panel')?.remove();
  });
  
  function logToDebug(message: string) {
    const output = document.getElementById('debug-output');
    if (output) {
      output.innerHTML = `${message}<br>${output.innerHTML}`;
    }
  }
  
  return 'Debug UI created. Use the panel in the bottom right corner.';
}

/**
 * ------------------------------------------------------------
 * SECTION 3: Watch API Requests for Document IDs
 * ------------------------------------------------------------
 * Monitors network requests to check if document IDs are being sent
 */

/**
 * Function to monitor API requests and check for document IDs
 */
function monitorApiRequests() {
  // Store original fetch to restore later
  const originalFetch = window.fetch;
  
  // Override fetch to intercept API calls
  window.fetch = function(input, init) {
    // Check if this is an AI API call
    const url = input.toString();
    if (url.includes('/ai/')) {
      console.log(`🔍 API Request to: ${url}`);
      
      // Check if body contains documentIds
      if (init?.body) {
        try {
          const body = JSON.parse(init.body.toString());
          if (body.documentIds) {
            console.log(`✅ Document IDs found in request:`, body.documentIds);
          } else {
            console.warn(`⚠️ No documentIds field in request payload!`);
            console.log('Request payload:', body);
          }
        } catch (e) {
          console.error('Error parsing request body:', e);
        }
      } else {
        console.warn(`⚠️ No body in request to ${url}`);
      }
    }
    
    // Call original fetch
    return originalFetch.apply(this, [input, init]);
  };
  
  console.log('API request monitoring enabled. Watching for /ai/ endpoints...');
  
  // Return function to restore original fetch
  return function stopMonitoring() {
    window.fetch = originalFetch;
    console.log('API request monitoring disabled.');
  };
}

/**
 * ------------------------------------------------------------
 * SECTION 4: Sample Document IDs for Testing
 * ------------------------------------------------------------
 * Provides some sample document IDs that can be used for testing
 */

/**
 * Function to set sample document IDs in session storage for testing
 */
function setSampleDocuments() {
  // Sample document IDs (replace with actual IDs from your system)
  const sampleDocIds = [
    "02a754f2-92fe-4742-a90a-6c577118ab4b",
    "15c86421-abf3-49e7-b231-54e2d08c8ff9",
    "7de32f58-c8d1-4aec-b5c9-f2e5a3b47d0a"
  ];
  
  // Store in session storage
  sessionStorage.setItem('selected_documents', JSON.stringify([sampleDocIds[0]]));
  
  console.log(`✅ Stored sample document ID in session storage: ${sampleDocIds[0]}`);
  console.log('Other sample IDs for testing:');
  sampleDocIds.slice(1).forEach(id => console.log(`- ${id}`));
  
  return sampleDocIds;
}

/**
 * ------------------------------------------------------------
 * SECTION 5: Usage Instructions
 * ------------------------------------------------------------
 */

/**
 * Function to show usage instructions in console
 */
function showInstructions() {
  console.log(`
=======================================================
👇 QUICK ACTIONS DEBUGGING TOOLKIT - USAGE GUIDE 👇
=======================================================

Step 1: Expose internal functions
--------------------------------
> exposeQuickActionFunctions()

Step 2: Create debugging UI panel
--------------------------------
> createDebugUi()

Step 3: Set sample document IDs (optional)
-----------------------------------------
> setSampleDocuments()

Step 4: Monitor API requests to check document IDs
-------------------------------------------------
> const stopMonitoring = monitorApiRequests()
> // When done:
> stopMonitoring()

Quick Commands:
--------------
> (window as any).checkSelectedDocuments()  // Check selected docs
> (window as any).toggleDocumentSelection("doc-id-here")  // Toggle selection
> (window as any).handleQuickAction("extract_dates")  // Trigger action

=======================================================
  `);
  
  return "Usage instructions printed to console";
}

// Auto-show instructions when this script is pasted into console
showInstructions(); 