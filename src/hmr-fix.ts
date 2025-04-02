/**
 * Enhanced HMR Fix - Prevents unwanted page refreshes and protects DOM during quick actions
 */

export function initHMRFix() {
  if (typeof window === 'undefined' || !import.meta.hot) {
    return; // Only run in browser with HMR
  }

  // Only log if debugging is enabled
  if (localStorage.getItem('DEBUG_HMR') === 'true') {
    console.log('Initializing enhanced HMR fix');
  }
  
  // Create a more reliable flag to completely disable HMR during quick actions
  let isQuickActionInProgress = false;
  
  // Check session storage for quick action flag on initialization
  if (sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
    console.log('Quick action was in progress during page load - completely disabling HMR');
    isQuickActionInProgress = true;
    window.__HMR_DISABLED = true;
    
    // Set a longer-lived flag to prevent navigation during initial page load
    sessionStorage.setItem('HMR_COMPLETELY_DISABLED', 'true');
    
    // Ensure the original conversation ID is preserved
    const preservedConversationId = sessionStorage.getItem('PRESERVED_CONVERSATION_ID');
    if (preservedConversationId) {
      console.log('Found preserved conversation ID:', preservedConversationId);
      
      // Check if we need to restore the URL
      const currentPath = window.location.pathname;
      if (preservedConversationId && !currentPath.includes(preservedConversationId)) {
        // Try to reconstruct the original path
        const clientIdMatch = currentPath.match(/\/lawyer\/ai(?:-new)?\/([^/]+)/);
        if (clientIdMatch && clientIdMatch[1]) {
          const clientId = clientIdMatch[1];
          const newPath = currentPath.replace(/\/[^/]+$/, `/${preservedConversationId}`);
          
          console.log(`Restoring conversation path from ${currentPath} to ${newPath}`);
          
          // Use setTimeout to ensure this happens after initial page load
          setTimeout(() => {
            window.history.replaceState(null, '', newPath);
          }, 100);
        }
      }
    }
  }
  
  // Enhanced function to check quick action status
  function checkQuickActionStatus() {
    // Check multiple flags to determine if a quick action is in progress
    const isInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    const hasTimestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP') !== null;
    const cleanup = sessionStorage.getItem('QUICK_ACTION_CLEANUP_IN_PROGRESS') === 'true';
    
    // If cleanup is in progress, don't consider it an active quick action
    if (cleanup) {
      return false;
    }
    
    // Check if the timestamp is recent (within last 60 seconds)
    if (hasTimestamp) {
      const timestamp = parseInt(sessionStorage.getItem('QUICK_ACTION_TIMESTAMP') || '0', 10);
      const now = Date.now();
      const isRecent = (now - timestamp) < 60000; // 60 seconds
      
      // If there's a timestamp but it's old, the quick action may have stalled
      if (!isRecent && isInProgress) {
        console.log('HMR fix: Detected stale quick action (timestamp > 60s), will allow navigation');
        return false;
      }
    }
    
    return isInProgress;
  }
  
  // More comprehensive window.location.reload protection
  // Instead of trying to directly override reload (which is read-only),
  // we'll create a wrapper function that can be called before reload
  const safeReload = function(...args) {
    if (checkQuickActionStatus() || isQuickActionInProgress) {
      console.log('HMR fix: Blocked page reload during quick action');
      if (window.showToast) {
        window.showToast({
          title: 'Page Reload Blocked',
          description: 'Please wait for the current action to complete before refreshing.',
          variant: 'warning'
        });
      }
      return false;
    }
    // If no quick action, allow the original reload
    window.location.reload.apply(window.location, args);
    return true;
  };
  
  // Add the safe reload function to window for other code to use
  // Use Object.defineProperty to prevent conflicts with other definitions
  if (!window.safeReload) {
    Object.defineProperty(window, 'safeReload', {
      value: safeReload,
      writable: false,
      configurable: false
    });
  }
  
  // CRITICAL IMPROVEMENT: Directly override Vite's HMR update handler
  // This is the most direct way to prevent HMR from refreshing the page
  if (import.meta.hot) {
    // Create a reference to the original handlers
    const originalAccept = import.meta.hot.accept;
    const originalDispose = import.meta.hot.dispose;
    
    // Replace the accept method with our own version that checks for quick actions
    import.meta.hot.accept = function(...args) {
      // Always check if quick action is in progress before allowing HMR updates
      if (checkQuickActionStatus() || isQuickActionInProgress || sessionStorage.getItem('HMR_COMPLETELY_DISABLED') === 'true') {
        console.log('🛑 Quick action in progress - BLOCKING HMR update completely');
        // Return a no-op function instead of the real handler
        return function() {
          console.log('🛑 HMR update blocked due to active quick action');
        };
      }
      
      // Otherwise, use the original accept
      return originalAccept.apply(import.meta.hot, args);
    };
    
    // Also directly block the dispose method during quick actions
    import.meta.hot.dispose = function(callback) {
      // Check if quick action is in progress
      if (checkQuickActionStatus() || isQuickActionInProgress || sessionStorage.getItem('HMR_COMPLETELY_DISABLED') === 'true') {
        console.log('🛑 Quick action in progress - BLOCKING HMR dispose');
        // Return a safe version that won't affect the DOM
        return originalDispose.call(import.meta.hot, function safeDispose(data) {
          console.log('Safe dispose called during quick action, preserving state');
          // Keep the DOM intact - don't run any cleanup
        });
      }
      
      // Otherwise use the original callback
      return originalDispose.apply(import.meta.hot, arguments);
    };
    
    // Also override invalidate to prevent invalidation during quick actions
    const originalInvalidate = import.meta.hot.invalidate;
    if (originalInvalidate) {
      import.meta.hot.invalidate = function() {
        if (checkQuickActionStatus() || isQuickActionInProgress || sessionStorage.getItem('HMR_COMPLETELY_DISABLED') === 'true') {
          console.log('🛑 Quick action in progress - BLOCKING HMR invalidate');
          return;
        }
        return originalInvalidate.apply(import.meta.hot, arguments);
      };
    }
    
    // Block any HMR data event
    const originalData = import.meta.hot.data;
    Object.defineProperty(import.meta.hot, 'data', {
      get: function() {
        if (checkQuickActionStatus() || isQuickActionInProgress || sessionStorage.getItem('HMR_COMPLETELY_DISABLED') === 'true') {
          console.log('🛑 Quick action in progress - Returning empty HMR data to prevent updates');
          return {}; // Return empty object instead of real data
        }
        return originalData;
      }
    });
  }
  
  // Patch assign method - since we can't modify window.location.assign directly,
  // we'll use event listeners to intercept navigation attempts
  try {
    // We can't override assign, but we can intercept clicks on links
    document.addEventListener('click', (event) => {
      if (checkQuickActionStatus() || isQuickActionInProgress) {
        // Check if the click was on an anchor tag
        const anchor = (event.target as HTMLElement).closest('a');
        if (anchor && anchor.href && 
            !anchor.href.startsWith('javascript:') && 
            !anchor.classList.contains('force-navigation')) {
          
          const isSamePage = anchor.href.includes(window.location.pathname) || 
                              anchor.href.endsWith('#') ||
                              anchor.href.includes('#') && anchor.href.split('#')[0] === window.location.href.split('#')[0];
          
          // Allow same-page navigation (anchor links)
          if (!isSamePage) {
            console.log('HMR fix: Blocking navigation via click during quick action:', anchor.href);
            event.preventDefault();
            event.stopPropagation();
            
            // Show a toast message if the toast function is available
            if (window.showToast) {
              window.showToast({
                title: 'Navigation Blocked',
                description: 'Please wait for the current action to complete before navigating away.',
                variant: 'warning'
              });
            }
            return false;
          }
        }
      }
    }, true);
    
    // Also try to intercept hashchange events
    window.addEventListener('hashchange', (e) => {
      if (checkQuickActionStatus() || isQuickActionInProgress) {
        console.log('HMR fix: Intercepted hashchange event during quick action');
        e.preventDefault();
        return false;
      }
    }, true);
  } catch (e) {
    console.warn('Could not setup navigation interception:', e);
  }
  
  // Monitor session storage changes to detect quick action status
  window.addEventListener('storage', (event) => {
    if (event.key === 'QUICK_ACTION_IN_PROGRESS') {
      if (event.newValue === 'true') {
        console.log('Quick action started - completely disabling HMR');
        isQuickActionInProgress = true;
        window.__HMR_DISABLED = true;
        
        // Preserve auth state during quick actions
        sessionStorage.setItem('PRESERVE_AUTH_STATE', 'true');
      } else if (event.newValue === null || event.newValue === 'false') {
        console.log('Quick action completed - re-enabling HMR after delay');
        
        // Keep auth state for a bit longer to ensure the action completes fully
        setTimeout(() => {
          // Don't remove PRESERVE_AUTH_STATE immediately - give a longer delay
          isQuickActionInProgress = false;
          window.__HMR_DISABLED = false;
        }, 5000); // 5 second delay before re-enabling
        
        // Clear auth preservation after a longer delay
        setTimeout(() => {
          sessionStorage.removeItem('PRESERVE_AUTH_STATE');
        }, 10000); // 10 second delay
      }
    }
  });
  
  // More aggressive monitoring of quick action status
  setInterval(() => {
    const quickActionInProgress = checkQuickActionStatus();
    if (quickActionInProgress && !isQuickActionInProgress) {
      console.log('Quick action detected via interval check - disabling HMR');
      isQuickActionInProgress = true;
      window.__HMR_DISABLED = true;
      
      // Store the current URL so we can restore it if needed
      sessionStorage.setItem('QUICK_ACTION_PRESERVED_URL', window.location.pathname);
      sessionStorage.setItem('HMR_COMPLETELY_DISABLED', 'true');
      
      // Preserve auth state during quick actions
      sessionStorage.setItem('PRESERVE_AUTH_STATE', 'true');
    } else if (!quickActionInProgress && isQuickActionInProgress) {
      console.log('Quick action completed via interval check - will re-enable HMR', window.location.pathname);
      
      // Use a longer delay to ensure stability
      setTimeout(() => {
        isQuickActionInProgress = false;
        window.__HMR_DISABLED = false;
        sessionStorage.removeItem('HMR_COMPLETELY_DISABLED');
        
        // Keep auth state preservation flag for a bit longer
        setTimeout(() => {
          sessionStorage.removeItem('PRESERVE_AUTH_STATE');
        }, 5000); // 5 second delay
        
        // Check if the URL changed during the quick action
        const preservedUrl = sessionStorage.getItem('QUICK_ACTION_PRESERVED_URL');
        if (preservedUrl && preservedUrl !== window.location.pathname) {
          console.log('URL changed during quick action, checking if we need to restore:', {
            preserved: preservedUrl,
            current: window.location.pathname
          });
          
          // Only restore if the current URL doesn't contain the preserved conversation ID
          const preservedConversationId = sessionStorage.getItem('PRESERVED_CONVERSATION_ID');
          if (preservedConversationId && !window.location.pathname.includes(preservedConversationId)) {
            console.log('Restoring conversation URL after quick action completion');
            window.location.href = preservedUrl;
          }
        }
      }, 5000); // 5 second delay before re-enabling
    }
  }, 1000); // Check every second

  // Use the beforeunload event to prevent page refreshes during quick actions
  window.addEventListener('beforeunload', (event) => {
    if (checkQuickActionStatus() || isQuickActionInProgress) {
      // Log the attempt to leave the page during a quick action
      console.log('Preventing page reload during quick action');
      
      // Standard way to prevent unload/refresh
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
  }, { capture: true }); // Use capture to intercept event at earliest possible phase

  // Also intercept F5 key to prevent refresh during quick actions
  document.addEventListener('keydown', (event) => {
    // Check for F5 (code 116) or Ctrl+R (code 82 with ctrlKey)
    if ((event.key === 'F5' || event.keyCode === 116 || (event.ctrlKey && (event.key === 'r' || event.keyCode === 82))) && 
        (checkQuickActionStatus() || isQuickActionInProgress)) {
      console.log('Intercepted F5/Ctrl+R refresh attempt during quick action');
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // Show a message to the user if possible
      if (window.showToast) {
        window.showToast({
          title: 'Refresh Blocked',
          description: 'Please wait for the current action to complete before refreshing.',
          variant: 'warning'
        });
      }
      return false;
    }
  }, { capture: true }); // Use capture phase to intercept before other handlers

  // Instead of trying to override reload directly, track navigation events
  // and warn the user when a navigation happens during a quick action
  let lastPathname = window.location.pathname;
  let lastHref = window.location.href;
  
  // Use MutationObserver to detect any DOM changes that might indicate reload
  const bodyObserver = new MutationObserver((mutations) => {
    if (checkQuickActionStatus() || isQuickActionInProgress) {
      if (window.location.href !== lastHref) {
        console.log('URL changed during quick action', {
          from: lastHref,
          to: window.location.href
        });
        
        // Store the new URL for future change detection
        lastHref = window.location.href;
        lastPathname = window.location.pathname;
      }
    }
  });
  
  // Start observing once DOM is ready
  if (document.body) {
    bodyObserver.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      bodyObserver.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    });
  }
  
  // Use the popstate event to monitor navigation changes
  window.addEventListener('popstate', (event) => {
    if (checkQuickActionStatus() || isQuickActionInProgress) {
      console.log('Navigation detected during quick action');
      
      // This will run when user clicks back/forward buttons
      // We can't prevent the navigation here, but we can log it
      if (lastPathname !== window.location.pathname) {
        console.warn(`Quick action interrupted by navigation: ${lastPathname} -> ${window.location.pathname}`);
        
        // Store the current path in session for potential recovery
        sessionStorage.setItem('INTERRUPTED_QUICK_ACTION_PATH', lastPathname);
      }
    }
    
    // Update the last pathname
    lastPathname = window.location.pathname;
    lastHref = window.location.href;
  });
  
  // Track tab visibility changes, and check if we need to restore state
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
      
      // When tab becomes visible, check if we were in the middle of a quick action
      if (quickActionInProgress) {
        console.log('Tab became visible during quick action, checking state');
        
        // Check when the quick action started
        const quickActionTimestamp = parseInt(sessionStorage.getItem('QUICK_ACTION_TIMESTAMP') || '0', 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - quickActionTimestamp;
        
        if (elapsedTime > 60000) { // 1 minute timeout
          console.log('Quick action appears to be stale - clearing flags to prevent freezing the UI');
          
          // Clear quick action flags but preserve other state
          sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
          sessionStorage.removeItem('QUICK_ACTION_TYPE');
          sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
          
          // Re-enable HMR
          window.__HMR_DISABLED = false;
          isQuickActionInProgress = false;
          
          // Show toast to inform user if possible
          if (window.showToast) {
            window.showToast({
              title: 'Action Timed Out',
              description: 'The previous action appears to have timed out. You can try again.',
              variant: 'destructive'
            });
          }
        } else {
          // Action is still valid, check if URL changed while tab was invisible
          const preservedUrl = sessionStorage.getItem('QUICK_ACTION_PRESERVED_URL');
          if (preservedUrl && preservedUrl !== window.location.pathname) {
            console.log('URL changed while tab was invisible, checking if we need to restore');
            
            // Check if the current URL has the active conversation ID
            const preservedConversationId = sessionStorage.getItem('PRESERVED_CONVERSATION_ID') || 
                                           sessionStorage.getItem('CURRENT_CONVERSATION_ID');
                                           
            if (preservedConversationId && !window.location.pathname.includes(preservedConversationId)) {
              console.log('Need to restore conversation path after tab visibility change');
              
              // Use history.replaceState to avoid adding a new history entry
              window.history.replaceState(null, '', preservedUrl);
            }
          }
        }
      }
    } else if (document.visibilityState === 'hidden') {
      // When tab becomes hidden during quick action, save important state
      if (checkQuickActionStatus() || isQuickActionInProgress) {
        console.log('Tab hidden during quick action - saving state');
        sessionStorage.setItem('QUICK_ACTION_PRESERVED_URL', window.location.pathname);
        
        // Ensure the current conversation ID is preserved
        const currentConvId = sessionStorage.getItem('CURRENT_CONVERSATION_ID');
        if (currentConvId) {
          sessionStorage.setItem('PRESERVED_CONVERSATION_ID', currentConvId);
        }
      }
    }
  });
}

// Add to global window type
declare global {
  interface Window {
    __HMR_DISABLED?: boolean;
    showToast?: (options: { title: string; description: string; variant: string }) => void;
    safeReload: ((...args: any[]) => boolean);
    __BLOCK_REFRESH_DURING_QUICK_ACTION?: boolean;
  }
}

// Auto-initialize with enhanced settings
initHMRFix(); 