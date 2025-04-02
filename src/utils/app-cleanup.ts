/**
 * Application Cleanup Utilities
 * 
 * This file contains functions to help clear caches, local storage, 
 * and manage application state for troubleshooting issues.
 */

import { toast } from '@/components/ui/use-toast';

/**
 * Clear application caches and storage that might be causing issues
 */
export function cleanupApplicationState(options: {
  clearLocalStorage?: boolean,
  clearSessionStorage?: boolean,
  clearCaches?: boolean,
  clearCookies?: boolean,
  showToast?: boolean
} = {}) {
  const {
    clearLocalStorage = false,
    clearSessionStorage = false,
    clearCaches = false,
    clearCookies = false,
    showToast = true
  } = options;
  
  let actionsPerformed = 0;
  
  // Clear relevant items from localStorage
  if (clearLocalStorage) {
    const preserveKeys = [
      // Keys to preserve even during cleanup
      'theme', 
      'color-scheme',
      'user-preferences'
    ];
    
    try {
      // Only clear app-specific items
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preserveKeys.includes(key)) {
          if (key.includes('supabase') || 
              key.includes('auth') || 
              key.includes('ai_law') || 
              key.includes('session')) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[Cleanup] Removed ${keysToRemove.length} items from localStorage`);
      actionsPerformed += keysToRemove.length;
    } catch (e) {
      console.error('[Cleanup] Error clearing localStorage:', e);
    }
  }
  
  // Clear all sessionStorage items
  if (clearSessionStorage) {
    try {
      const itemCount = sessionStorage.length;
      sessionStorage.clear();
      console.log(`[Cleanup] Cleared ${itemCount} items from sessionStorage`);
      actionsPerformed += 1;
    } catch (e) {
      console.error('[Cleanup] Error clearing sessionStorage:', e);
    }
  }
  
  // Clear caches using the Cache API if available
  if (clearCaches && 'caches' in window) {
    try {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log(`[Cleanup] Deleted cache: ${cacheName}`);
          actionsPerformed += 1;
        });
      });
    } catch (e) {
      console.error('[Cleanup] Error clearing caches:', e);
    }
  }
  
  // Clear cookies if requested
  if (clearCookies) {
    try {
      const cookies = document.cookie.split(';');
      
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name) {
          // Set expiration to past date to delete
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        }
      });
      
      console.log(`[Cleanup] Cleared ${cookies.length} cookies`);
      actionsPerformed += cookies.length;
    } catch (e) {
      console.error('[Cleanup] Error clearing cookies:', e);
    }
  }
  
  // Show toast notification if requested
  if (showToast) {
    toast({
      title: "Application Cleanup",
      description: `Cleared ${actionsPerformed} cached items. Please refresh the page for changes to take effect.`,
      duration: 5000
    });
  }
  
  return actionsPerformed;
}

/**
 * Specifically clear Supabase-related state that might be causing auth issues
 */
export function clearSupabaseState() {
  let clearedItems = 0;
  
  // Clear Supabase auth tokens and state from localStorage
  const supabaseKeys = [
    'supabase.auth.token',
    'supabase-auth-token',
    'ai_law_auth_token',
    'supabase-auth',
    'supabase_offline',
    'supabase_offline_time',
    'auth_session_start',
    'auth_session_expires'
  ];
  
  supabaseKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      clearedItems++;
    }
  });
  
  // Add additional Supabase-related cleanup here if needed
  
  if (clearedItems > 0) {
    toast({
      title: "Auth Cleanup",
      description: `Cleared ${clearedItems} auth-related items. Please sign in again.`,
      duration: 5000
    });
  }
  
  return clearedItems;
}

/**
 * Fix page reloading issues by controlling Supabase client instances and optimizing auth refreshes
 */
export function fixPageReloadIssues() {
  // Control flags in session storage to prevent cascading refreshes
  sessionStorage.setItem('PREVENT_AUTH_REFRESH_CASCADE', 'true');
  
  // Set a timeout to ensure we don't constantly block auth refreshes
  setTimeout(() => {
    sessionStorage.removeItem('PREVENT_AUTH_REFRESH_CASCADE');
  }, 5000);
  
  // Handle Supabase client duplication issues
  // This helps when multiple GoTrueClient instances are detected
  if (window.__SUPABASE_CONNECTION) {
    const connections = window.__SUPABASE_CONNECTION;
    
    // If auth is in progress, mark a cooldown period
    if (connections.authInProgress) {
      connections.authCooldown = Date.now() + 3000; // 3 second cooldown
    }
    
    // Temporarily disable auto-refresh to prevent cascading auth events
    if (typeof connections.disableAutoRefresh === 'function') {
      connections.disableAutoRefresh(true);
      
      // Re-enable after a delay
      setTimeout(() => {
        if (typeof connections.disableAutoRefresh === 'function') {
          connections.disableAutoRefresh(false);
        }
      }, 5000);
    }
  }
  
  // Stop visibility change events from triggering auth refreshes
  const originalVisiblityChange = document.onvisibilitychange;
  document.onvisibilitychange = function(e) {
    // If we're in a cooldown period, don't trigger auth refreshes
    if (sessionStorage.getItem('PREVENT_AUTH_REFRESH_CASCADE')) {
      console.log('[Page Reload Fix] Preventing visibility change from triggering auth refresh');
      e.stopImmediatePropagation();
      return false;
    }
    
    // Otherwise proceed with the original handler
    if (originalVisiblityChange) {
      return originalVisiblityChange.call(this, e);
    }
  };
  
  // Notify the user
  toast({
    title: "Performance Optimized",
    description: "Page reload issues should be fixed now.",
    duration: 2000
  });
  
  // Return a cleanup function to restore original behavior
  return function cleanup() {
    document.onvisibilitychange = originalVisiblityChange;
    sessionStorage.removeItem('PREVENT_AUTH_REFRESH_CASCADE');
  };
}

/**
 * Perform a full application reset
 */
export function performFullReset() {
  const itemsCleared = cleanupApplicationState({
    clearLocalStorage: true,
    clearSessionStorage: true,
    clearCaches: true,
    clearCookies: true,
    showToast: false
  });
  
  toast({
    title: "Full Application Reset",
    description: `Reset completed. Cleared ${itemsCleared} items. The page will refresh in a moment.`,
    duration: 3000
  });
  
  // Reload the page after a short delay
  setTimeout(() => {
    window.location.href = '/';
  }, 2000);
} 