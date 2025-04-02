/**
 * Quick Actions Fix - Debug Script
 * 
 * This script provides a quick fix for the AI Lawyer Quick Actions functionality.
 * It fixes the following issues:
 * 1. Ensures document selection functions are accessible
 * 2. Forces the sidebar to be open to show document selection UI
 * 3. Adds a debug UI to help with testing
 * 
 * How to use:
 * 1. Copy and paste this entire script into your browser console
 * 2. Call window.fixQuickActions() to apply all fixes
 * 3. Call window.createQuickActionsDebugUI() to show a debug panel
 */

window.fixQuickActions = function() {
  console.log('🔧 Applying Quick Actions fix...');
  
  // Function to find React component instances
  function findReactComponents(rootNode = document.body, componentNamePattern) {
    // Find all React fiber nodes
    const fiberRoots = Array.from(document.querySelectorAll('[data-reactroot]'))
      .map(node => node._reactRootContainer?._internalRoot?.current);
    
    // Also try to find React 18+ fiber nodes
    const react18Roots = [];
    try {
      const rootKey = Object.keys(document).find(key => 
        key.startsWith('__reactContainer$') || 
        key.startsWith('__reactFiber$') || 
        key.startsWith('__reactProps$')
      );
      
      if (rootKey) {
        const fiberPrefix = rootKey.replace(/\$.*$/, '$');
        
        Array.from(document.querySelectorAll('*'))
          .forEach(node => {
            // Find any React nodes
            const keys = Object.keys(node);
            const fiberKey = keys.find(key => key.startsWith(fiberPrefix));
            if (fiberKey) {
              const fiber = node[fiberKey];
              if (fiber) {
                react18Roots.push(fiber);
              }
            }
          });
      }
    } catch (e) {
      console.error('Error finding React 18+ fiber nodes:', e);
    }
    
    // Merge all roots
    const allRoots = [...fiberRoots, ...react18Roots].filter(Boolean);
    
    // Extract components
    const components = [];
    const visitedNodes = new Set();
    
    function traverseFiber(fiber) {
      if (!fiber || visitedNodes.has(fiber)) return;
      visitedNodes.add(fiber);
      
      // Check if this fiber has a component
      try {
        const fiberName = fiber.type?.displayName || fiber.type?.name;
        if (fiberName && (!componentNamePattern || fiberName.match(componentNamePattern))) {
          components.push({
            name: fiberName,
            fiber,
            stateNode: fiber.stateNode,
            props: fiber.memoizedProps,
            state: fiber.memoizedState,
          });
        }
      } catch (e) { /* Ignore errors */ }
      
      // Visit children
      if (fiber.child) traverseFiber(fiber.child);
      if (fiber.sibling) traverseFiber(fiber.sibling);
      if (fiber.return) traverseFiber(fiber.return);
    }
    
    allRoots.forEach(root => traverseFiber(root));
    return components;
  }
  
  // Force the sidebar to be open
  function forceSidebarOpen() {
    try {
      // Find the AILawyerPageNew component
      const aiLawyerComponents = findReactComponents(document.body, /AILawyerPage/);
      console.log('Found AI Lawyer components:', aiLawyerComponents.length);
      
      if (aiLawyerComponents.length > 0) {
        // Try to find the setSidebarOpen function in props
        const component = aiLawyerComponents[0];
        const props = component.props || {};
        
        // Find the setSidebarOpen function
        if (props.setSidebarOpen) {
          props.setSidebarOpen(true);
          console.log('Forced sidebar open via props');
          return true;
        }
        
        // Try to find the function in state
        if (component.stateNode && typeof component.stateNode.setState === 'function') {
          component.stateNode.setState(prevState => ({
            ...prevState,
            sidebarOpen: true
          }));
          console.log('Forced sidebar open via setState');
          return true;
        }
      }
      
      // Fallback to session storage
      sessionStorage.setItem('FORCE_SIDEBAR_OPEN', 'true');
      return false;
    } catch (e) {
      console.error('Error forcing sidebar open:', e);
      return false;
    }
  }

  // Try to expose document selection functions
  function exposeDocumentFunctions() {
    try {
      // Find the AILawyerPageNew component
      const aiLawyerComponents = findReactComponents(document.body, /AILawyerPage/);
      
      if (aiLawyerComponents.length === 0) {
        console.error('No AILawyerPage components found');
        return false;
      }
      
      const component = aiLawyerComponents[0];
      const props = component.props || {};
      const state = component.state || {};
      
      // Extract functions and state
      let toggleDocumentSelection = props.toggleDocumentSelection;
      let handleQuickAction = props.handleQuickAction;
      let selectedFiles = props.selectedFiles || [];
      let clientFiles = props.clientFiles || [];
      
      // If not in props, try to find in component methods
      if (!toggleDocumentSelection && component.stateNode) {
        toggleDocumentSelection = component.stateNode.toggleDocumentSelection;
        handleQuickAction = component.stateNode.handleQuickAction;
        selectedFiles = component.stateNode.state?.selectedFiles || [];
        clientFiles = component.stateNode.state?.clientFiles || [];
      }
      
      // Expose functions to window
      if (toggleDocumentSelection) {
        window.toggleDocumentSelection = toggleDocumentSelection;
        console.log('✅ Exposed toggleDocumentSelection function');
      } else {
        console.error('❌ Could not find toggleDocumentSelection function');
      }
      
      if (handleQuickAction) {
        window.handleQuickAction = handleQuickAction;
        console.log('✅ Exposed handleQuickAction function');
      } else {
        console.error('❌ Could not find handleQuickAction function');
      }
      
      // Create helper functions
      window.getSelectedDocuments = () => {
        return selectedFiles;
      };
      
      window.getClientFiles = () => {
        return clientFiles;
      };
      
      window.selectFirstDocument = () => {
        const files = window.getClientFiles();
        if (files && files.length > 0) {
          const firstFile = files[0];
          const fileId = typeof firstFile === 'string' ? firstFile : firstFile.id;
          console.log('Selecting first document:', fileId);
          window.toggleDocumentSelection(fileId);
          return fileId;
        } else {
          console.error('No client files found to select');
          return null;
        }
      };
      
      // Check session storage for documents
      window.checkSessionStorage = () => {
        try {
          const selectedFiles = JSON.parse(sessionStorage.getItem('SELECTED_FILES') || '[]');
          console.log('Selected files in session storage:', selectedFiles);
          return selectedFiles;
        } catch (e) {
          console.error('Error checking session storage:', e);
          return [];
        }
      };
      
      return true;
    } catch (e) {
      console.error('Error exposing document functions:', e);
      return false;
    }
  }
  
  // Create a simple UI helper for debugging
  function createHelperUI() {
    // Remove any existing UI
    const existingUI = document.getElementById('quick-actions-helper');
    if (existingUI) {
      existingUI.remove();
    }
    
    // Create the UI
    const ui = document.createElement('div');
    ui.id = 'quick-actions-helper';
    ui.style.position = 'fixed';
    ui.style.bottom = '20px';
    ui.style.right = '20px';
    ui.style.backgroundColor = '#f9f9f9';
    ui.style.border = '1px solid #ccc';
    ui.style.borderRadius = '5px';
    ui.style.padding = '10px';
    ui.style.zIndex = '9999';
    ui.style.maxWidth = '300px';
    ui.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Quick Actions Helper';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '14px';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '5px';
    ui.appendChild(title);
    
    // Add document info
    const documentInfo = document.createElement('div');
    documentInfo.style.fontSize = '12px';
    documentInfo.style.marginBottom = '10px';
    ui.appendChild(documentInfo);
    
    // Add buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'grid';
    buttonsContainer.style.gridTemplateColumns = '1fr 1fr';
    buttonsContainer.style.gap = '5px';
    ui.appendChild(buttonsContainer);
    
    // Helper function to create buttons
    function createButton(text, onClick, color = '#0066cc') {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.backgroundColor = color;
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.padding = '5px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '12px';
      button.onclick = onClick;
      return button;
    }
    
    // Add force sidebar button
    buttonsContainer.appendChild(createButton('Force Sidebar Open', () => {
      forceSidebarOpen();
      updateUI();
    }));
    
    // Add select document button
    buttonsContainer.appendChild(createButton('Select First Doc', () => {
      window.selectFirstDocument();
      updateUI();
    }));
    
    // Add quick action buttons
    buttonsContainer.appendChild(createButton('Extract Dates', () => {
      window.handleQuickAction('Extract Dates');
    }, '#28a745'));
    
    buttonsContainer.appendChild(createButton('Summarize', () => {
      window.handleQuickAction('Summarize Document');
    }, '#28a745'));
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '16px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => ui.remove();
    ui.appendChild(closeButton);
    
    // Add update function
    function updateUI() {
      // Update document info
      const selectedFiles = window.getSelectedDocuments() || [];
      const clientFiles = window.getClientFiles() || [];
      
      documentInfo.innerHTML = `
        <div>Client Files: ${clientFiles.length}</div>
        <div>Selected Files: ${selectedFiles.length}</div>
        ${selectedFiles.length > 0 ? 
          `<div>Selected IDs: ${selectedFiles.map(f => typeof f === 'string' ? f : f.id).join(', ')}</div>` : 
          '<div>No files selected</div>'}
      `;
    }
    
    // Initial update
    updateUI();
    
    // Add to document
    document.body.appendChild(ui);
    
    // Return update function
    return updateUI;
  }
  
  // Execute all fixes
  forceSidebarOpen();
  exposeDocumentFunctions();
  
  // Set up global access
  window.createQuickActionsDebugUI = createHelperUI;
  
  console.log('✅ Quick Actions fix applied successfully');
  console.log('📌 You can now use:');
  console.log('- window.toggleDocumentSelection(fileId)');
  console.log('- window.handleQuickAction("Extract Dates")');
  console.log('- window.selectFirstDocument()');
  console.log('- window.createQuickActionsDebugUI()');
  
  return true;
}; 