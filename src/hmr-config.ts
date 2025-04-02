/**
 * HMR Configuration
 * Utilities for managing Hot Module Replacement without disrupting application state
 */

// Store for state that needs to persist during HMR
interface HMRState {
  preservedMessages?: any[];
  preservedDocuments?: any[];
  preservedSelectedDocuments?: string[];
  preservedModel?: string;
  timestamp: number;
}

// Global state for HMR
const HMR_STATE_KEY = 'HMR_PRESERVED_STATE';
const HMR_UPDATE_KEY = 'HMR_UPDATE_IN_PROGRESS';
// Add a key to track when the user last switched tabs
const TAB_SWITCH_KEY = 'TAB_SWITCH_TIMESTAMP';

/**
 * Save application state before HMR updates
 */
export function saveStateBeforeHMR(state: Partial<HMRState>): void {
  if (!import.meta.hot) return;
  
  try {
    // Add timestamp to track state freshness
    const timestamp = Date.now();
    const fullState: HMRState = {
      ...state,
      timestamp
    };
    
    // Save to sessionStorage for persistence across module reloads
    sessionStorage.setItem(HMR_STATE_KEY, JSON.stringify(fullState));
    sessionStorage.setItem(HMR_UPDATE_KEY, 'true');
    
    console.log('Application state preserved for HMR update:', 
      Object.keys(state).join(', '));
  } catch (e) {
    console.error('Failed to save state before HMR:', e);
  }
}

/**
 * Restore application state after HMR updates
 */
export function restoreStateAfterHMR<T extends Partial<HMRState>>(): T | null {
  if (!import.meta.hot) return null;
  
  try {
    // Check if an HMR update is in progress
    const isHmrUpdate = sessionStorage.getItem(HMR_UPDATE_KEY) === 'true';
    if (!isHmrUpdate) {
      return null;
    }
    
    // Get saved state
    const stateJson = sessionStorage.getItem(HMR_STATE_KEY);
    if (!stateJson) {
      return null;
    }
    
    const state = JSON.parse(stateJson) as HMRState;
    
    // Check if state is recent (within last 10 seconds)
    const isRecent = Date.now() - state.timestamp < 10000;
    if (!isRecent) {
      console.log('Discarding stale HMR state from', 
        new Date(state.timestamp).toLocaleTimeString());
      sessionStorage.removeItem(HMR_STATE_KEY);
      return null;
    }
    
    // Clear the update flag after a short delay
    setTimeout(() => {
      sessionStorage.removeItem(HMR_UPDATE_KEY);
    }, 500);
    
    console.log('Application state restored after HMR update:', 
      Object.keys(state).filter(k => k !== 'timestamp').join(', '));
    
    return state as T;
  } catch (e) {
    console.error('Failed to restore state after HMR:', e);
    return null;
  }
}

// Add event listeners to detect tab visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Record timestamp when tab becomes visible, but log only if debugging is enabled
      sessionStorage.setItem(TAB_SWITCH_KEY, Date.now().toString());
      
      // Check if debugging is enabled before logging
      if (localStorage.getItem('DEBUG_HMR') === 'true') {
        console.log('Tab became visible, recorded switch timestamp');
      }
    }
  });
  
  // Also track window focus events, but with reduced logging
  window.addEventListener('focus', () => {
    sessionStorage.setItem(TAB_SWITCH_KEY, Date.now().toString());
    
    // Only log if debugging is enabled
    if (localStorage.getItem('DEBUG_HMR') === 'true') {
      console.log('Window focused, recorded switch timestamp');
    }
  });
}

/**
 * Register HMR handlers
 */
export function setupHMRHandlers(
  saveCallback?: () => Partial<HMRState>,
  restoreCallback?: (state: Partial<HMRState>) => void
): void {
  if (!import.meta.hot) return;
  
  // Handle module disposal
  import.meta.hot.dispose(() => {
    console.log('HMR update detected, preparing for state preservation');
    
    // If a custom save callback is provided, use it
    if (saveCallback) {
      const state = saveCallback();
      saveStateBeforeHMR(state);
    }
    
    // Set global flag for HMR update
    sessionStorage.setItem(HMR_UPDATE_KEY, 'true');
  });
  
  // Handle module acceptance
  import.meta.hot.accept(() => {
    console.log('HMR update accepted, module reloaded');
    
    // If a custom restore callback is provided, use it
    if (restoreCallback) {
      const state = restoreStateAfterHMR();
      if (state) {
        restoreCallback(state);
      }
    }
  });
}

/**
 * Check if current render is due to an HMR update
 */
export function isHMRUpdate(): boolean {
  return sessionStorage.getItem(HMR_UPDATE_KEY) === 'true';
}

/**
 * Clear HMR state
 */
export function clearHMRState(): void {
  sessionStorage.removeItem(HMR_STATE_KEY);
  sessionStorage.removeItem(HMR_UPDATE_KEY);
}

// Initialize HMR handling
if (import.meta.hot) {
  setupHMRHandlers();
  
  // Check if recovering from an HMR update
  if (isHMRUpdate()) {
    console.log('Recovering from HMR update');
  }
} 