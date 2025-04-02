/**
 * HMR Tab Focus Tracker
 * 
 * This module sends tab focus events to the Vite dev server
 * to prevent unwanted HMR updates when switching tabs.
 * 
 * NOTE: This functionality is currently disabled as it was causing
 * refresh issues when combined with other HMR prevention mechanisms.
 */

// Initialize the tab focus tracker
export function initTabFocusTracker() {
  if (typeof window === 'undefined' || !import.meta.hot) {
    return; // Only run in browser with HMR
  }

  console.log('Tab focus tracker is disabled to prevent refresh issues');
  return; // Disabled

  // Get the WebSocket connection to the Vite server
  const getViteWs = () => {
    // @ts-ignore - Access the internal Vite WebSocket
    const ws = import.meta.hot?.socket;
    return ws;
  };

  // Send a tab focus event to the server
  const sendTabFocusEvent = () => {
    const ws = getViteWs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'tab-focus' }));
      console.log('Sent tab-focus event to Vite server');
    }
  };

  // Track tab visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendTabFocusEvent();
    }
  });

  // Track window focus events
  window.addEventListener('focus', () => {
    sendTabFocusEvent();
  });
}

// Disabled auto-initialization
// initTabFocusTracker(); 