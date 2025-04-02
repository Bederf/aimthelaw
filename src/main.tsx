/// <reference path="./global.d.ts" />
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { isHMRUpdate } from './hmr-config';
// Import Lovable Tagger script
import 'lovable-tagger/dist/lovable-tagger.js';

// COMPLETELY DISABLE HMR
// Instead of trying to manage HMR during quick actions, just disable it entirely
if (import.meta.hot) {
  // Replace the HMR accept function with a no-op that prevents updates
  const originalAccept = import.meta.hot.accept;
  import.meta.hot.accept = function() {
    console.log('HMR update blocked - HMR is completely disabled');
    return function() {}; // Return a no-op handler
  };
  
  // Also disable prune and dispose methods
  if (import.meta.hot.prune) {
    import.meta.hot.prune = function() {
      console.log('HMR prune blocked - HMR is completely disabled');
    };
  }
  
  if (import.meta.hot.dispose) {
    import.meta.hot.dispose = function() {
      console.log('HMR dispose blocked - HMR is completely disabled');
      return function() {};
    };
  }
  
  // Set a global flag that can be checked elsewhere
  window.__HMR_COMPLETELY_DISABLED = true;
  
  console.log('🛑 HMR functionality has been completely disabled to prevent page refreshes');
}

// Import the HMR fixes to prevent tab-switch refreshes
import './hmr-fix';
// Import supabase client to check connection status
import { supabase } from '@/integrations/supabase/client';

// Global variable to track the initial load
let isInitialLoad = true;

// Check Supabase connection at startup
async function checkSupabaseConnection() {
  console.log('Checking Supabase connection at startup...');
  
  // Get the Supabase URL from environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://weujfmfubskndhvokixy.supabase.co';
  
  try {
    // Simple ping to check if Supabase is reachable
    const response = await fetch(supabaseUrl, {
      method: 'HEAD'
    });
    
    if (response.ok) {
      console.log('Supabase connection verified via HEAD request');
      setupConnection(true, 0);
    } else {
      console.warn('Supabase connection check failed:', response.status);
      setupConnection(false, 0, `HTTP error: ${response.status}`);
    }
  } catch (e) {
    console.error('Error checking Supabase connection:', e);
    setupConnection(false, 0, e instanceof Error ? e.message : String(e));
  }
}

// Setup connection monitoring
function setupConnection(isConnected: boolean, pingTime: number, errorMessage?: string) {
  window.__SUPABASE_CONNECTION = {
    isConnected,
    isNetworkOnline: navigator.onLine,
    lastChecked: Date.now(),
    pingTime,
    errorMessage
  };
  
  // Setup global network status check
  window.addEventListener('online', () => {
    console.log('Network connection restored');
    window.__SUPABASE_CONNECTION.isNetworkOnline = true;
    checkSupabaseConnection(); // Re-check once we're back online
  });
  
  window.addEventListener('offline', () => {
    console.log('Network connection lost');
    window.__SUPABASE_CONNECTION.isNetworkOnline = false;
    window.__SUPABASE_CONNECTION.isConnected = false;
  });
  
  // Set initial network status
  window.__SUPABASE_CONNECTION.isNetworkOnline = navigator.onLine;
}

// Set initial connection status before check
window.__SUPABASE_CONNECTION = {
  isConnected: true, // Assume connected to avoid unnecessary checks
  isNetworkOnline: navigator.onLine,
  lastChecked: Date.now(),
  pingTime: 0
};

// Don't check connection at startup to avoid CORS errors
// checkSupabaseConnection();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Add offline fallback behavior
      retry: (failureCount, error: any) => {
        // Don't retry if we're offline
        if (!window.__SUPABASE_CONNECTION.isNetworkOnline) return false;
        
        // Default retry logic - up to 3 times
        return failureCount < 3;
      },
      // Add stale time to reduce unnecessary refetches
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Add protection against React HMR errors during quick actions
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    // First, check if we need to clean up from a previous failed quick action
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    const lastUpdate = parseInt(sessionStorage.getItem('QUICK_ACTION_TIMESTAMP') || '0', 10);
    const currentTime = Date.now();
    
    // If a quick action has been "in progress" for more than 3 minutes, it's likely stuck
    if (quickActionInProgress && lastUpdate > 0 && (currentTime - lastUpdate > 180000)) {
      console.warn('Detected a stale quick action - cleaning up flags');
      sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
      sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
      sessionStorage.removeItem('HMR_COMPLETELY_DISABLED');
      rootElement.classList.remove('quick-action-in-progress');
      window.__HMR_DISABLED = false;
    } else if (quickActionInProgress) {
      // Update the timestamp for a legitimate quick action
      sessionStorage.setItem('QUICK_ACTION_TIMESTAMP', currentTime.toString());
      console.log('Quick action in progress during initial render - using safe mode');
      // Add a temporary class to mark the element as having a quick action in progress
      rootElement.classList.add('quick-action-in-progress');
      // Set global flag
      window.__HMR_DISABLED = true;
    }
    
    // Create the root once
    const root = createRoot(rootElement);
    
    // Add a global error handler to catch any React errors
    window.addEventListener('error', (event) => {
      if (event.error && typeof event.error.message === 'string') {
        const errorMessage = event.error.message;
        
        // Check if this is a React DOM error
        if (errorMessage.includes('Target container is not a DOM element') ||
            errorMessage.includes('removeChild') ||
            errorMessage.includes('The node to be removed is not a child')) {
          
          console.error('Caught React DOM error:', errorMessage);
          
          // If we're in a quick action, mark it for special handling
          if (sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
            console.log('DOM error occurred during quick action - will attempt recovery');
            
            // In some cases, we need to force a reload to recover
            const forceReload = errorMessage.includes('removeChild');
            
            if (forceReload) {
              // Set a flag to indicate we're reloading due to an error
              sessionStorage.setItem('RECOVERING_FROM_ERROR', 'true');
              // Clear the quick action flag
              sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
              sessionStorage.removeItem('HMR_COMPLETELY_DISABLED');
              
              // Perform a reload after a short delay
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
          }
        }
      }
    });
    
    // Initialize Lovable observer if it exists
    if (window.LovableTagger) {
      console.log('Initializing Lovable Tagger');
      window.LovableTagger.startObserving();
    }
    
    // And render the app
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    
    // After initial render, set a timer to mark initial load as complete
    setTimeout(() => {
      isInitialLoad = false;
      console.log('Initial load phase complete');
    }, 3000); // 3 second initial load phase
  } catch (error) {
    console.error('Error rendering application:', error);
    // Attempt recovery by removing quick action flag
    sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
    sessionStorage.removeItem('HMR_COMPLETELY_DISABLED');
    
    // Add fallback content if render fails
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h2>Application Error</h2>
        <p>There was an error loading the application. Please refresh the page to try again.</p>
        <button onclick="(window.safeReload || function() { window.location.reload(); })()" style="padding: 0.5rem 1rem; background: #4F46E5; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
  }
}

/* 
// This component appears to be unrelated to main.tsx - commenting out to fix linter errors
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.metadata?.type === 'action_result') {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800">{message.metadata.action}</h3>
        <div className="mt-2 text-blue-900">
          {message.content}
        </div>
        {message.metadata.token_usage && (
          <div className="mt-2 text-sm text-blue-700">
            Tokens used: {message.metadata.token_usage.total_tokens}
          </div>
        )}
      </div>
    );
  }

  // ... existing message rendering code ...
};
*/
