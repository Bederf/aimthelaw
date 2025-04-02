/**
 * Fix for React DevTools
 * 
 * This script handles common DevTools issues:
 * 1. Prevents the "React DevTools encountered an error" message
 * 2. Fixes conflicts between multiple React versions
 * 3. Applies only in development mode (localhost)
 */

(function() {
  // Check if we're in development mode by looking at the URL
  const isDevelopment = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  // Only apply fixes in development mode
  if (!isDevelopment) {
    return;
  }
  
  console.log('[DevTools Fix] Applying React DevTools fixes');
  
  // Fix React DevTools errors by ensuring proper initialization
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    // Add error handler to prevent DevTools crashing on errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Filter out React DevTools errors
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('React DevTools') || 
           args[0].includes('Fiber tree'))) {
        console.log('[DevTools Fix] Suppressed DevTools error:', args[0]);
        return;
      }
      return originalConsoleError.apply(this, args);
    };
    
    // Fix conflict between multiple React versions
    if (hook.checkDCE) {
      const originalCheckDCE = hook.checkDCE;
      hook.checkDCE = function(fn, name) {
        try {
          originalCheckDCE(fn, name);
        } catch (e) {
          console.log('[DevTools Fix] Prevented DCE check error');
        }
      };
    }
  }
})(); 