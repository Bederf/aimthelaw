import { useEffect, useState, ErrorInfo, Component, ReactNode } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './theme/ThemeProvider';
import { MaterialThemeProvider } from './theme/MaterialThemeProvider';
import { globalStyles } from '@/styles/global';
import { themeService } from './services/themeService';
import SupabaseConfigVerifier from './components/SupabaseConfigVerifier';
import BreadcrumbProvider from './contexts/BreadcrumbContext';

// Custom error boundary to catch React DOM reconciliation errors
class ReactErrorBoundary extends Component<
  { children: ReactNode, fallback?: ReactNode },
  { hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null, isQuickActionError: boolean }
> {
  constructor(props: { children: ReactNode, fallback?: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isQuickActionError: false
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is likely a quick action related error
    const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    const isDOMError = 
      error.message.includes('Node') || 
      error.message.includes('DOM') || 
      error.message.includes('removeChild') ||
      error.message.includes('Target container');
    
    const isQuickActionError = isQuickActionInProgress && isDOMError;
    
    if (isQuickActionError) {
      console.log('Quick action DOM error detected, attempting recovery...');
      
      // Try to clear quick action flag to help recover
      setTimeout(() => {
        sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
      }, 100);
    }
    
    // Return new state
    return { 
      hasError: true, 
      error,
      isQuickActionError 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if it's a DOM Node error during a quick action
    const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    const isDOMError = 
      error.message.includes('Node') || 
      error.message.includes('removeChild') || 
      error.message.includes('Target container') ||
      error.message.includes('Cannot read properties');
    
    const isQuickActionError = isQuickActionInProgress && isDOMError;
    
    // Log the error
    console.error('Error caught by ReactErrorBoundary:', error, errorInfo);
    
    if (isQuickActionError) {
      console.log('DOM reconciliation error during quick action - will attempt recovery without page refresh');
      
      // For quick action errors, we want to recover WITHOUT refreshing the page if possible
      // Clear the error state but DON'T force a page refresh
      this.setState({
        errorInfo,
        isQuickActionError,
        // Don't set hasError to true for quick action errors - we want to try to recover gracefully
        hasError: false
      });
      
      // Don't remove the QUICK_ACTION_IN_PROGRESS flag, let the quick action finish normally
      return;
    }
    
    // For other errors, handle them normally
    this.setState({
      errorInfo,
      isQuickActionError: false,
      hasError: true
    });
  }

  tryToRecover = () => {
    // Clear any error state and try to render children again
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isQuickActionError: false
    });
    
    // Clear quick action flags
    sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
    
    // Refresh the page as a last resort to recover from severe errors
    // Use safeReload if available, otherwise fallback to direct reload
    if (window.safeReload) {
      window.safeReload();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Special handling for quick action errors
      if (this.state.isQuickActionError) {
        // For quick action errors, show a special message
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-4">DOM Update Error</h2>
              <p className="mb-4">An error occurred while updating the page during a quick action.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                The application is attempting to recover automatically.
              </p>
              <button
                onClick={this.tryToRecover}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Recover Now
              </button>
            </div>
          </div>
        );
      }
      
      // For regular errors, show the fallback UI or a default error message
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-md p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.tryToRecover}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component to handle theme changes on navigation
function ThemeNavigationHandler() {
  const location = useLocation();
  
  useEffect(() => {
    // When path changes, reapply the appropriate theme
    console.log(`Path changed to: ${location.pathname}, updating theme...`);
    
    // Small delay to ensure DOM is ready after route change
    const timeoutId = setTimeout(() => {
      themeService.applyThemeForCurrentPath()
        .then(() => console.log('Theme successfully applied after navigation'))
        .catch(error => console.warn('Error applying theme after navigation:', error));
    }, 50); // Short delay helps with more reliable theme application
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
  
  return null; // This component doesn't render anything
}

export function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  // Add state to track if quick action is in progress
  const [isQuickActionInProgress, setIsQuickActionInProgress] = useState(false);

  // Setup Lovable Tagger event listeners
  useEffect(() => {
    // Register Lovable callback handler if available
    if (typeof window !== 'undefined' && window.LovableTagger) {
      console.log('Setting up Lovable Tagger callbacks');
      
      // Handle UI update requests from Lovable
      window.LovableTagger.onUpdateRequest = (data) => {
        console.log('Received UI update request from Lovable:', data);
        // Handle component updates as needed
      };
    }
    
    return () => {
      // Cleanup event listeners if needed
      if (typeof window !== 'undefined' && window.LovableTagger) {
        window.LovableTagger.onUpdateRequest = null;
      }
    };
  }, []);

  // Check quick action status
  useEffect(() => {
    const checkQuickActionStatus = () => {
      const status = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
      setIsQuickActionInProgress(status);
    };
    
    // Check initially
    checkQuickActionStatus();
    
    // Setup interval to check periodically
    const intervalId = setInterval(checkQuickActionStatus, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Main initialization effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Apply the theme based on current path or saved preferences
        await themeService.initialize();
        
        // Perform any other initialization tasks here...
        
        // Mark initialization as complete
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Still mark as initialized to allow rendering even if some parts failed
        setIsInitialized(true);
      }
    };
    
    // Run the initialization
    initializeApp();
  }, []);

  // Render the app once initialized
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="ui-theme"
    >
      {globalStyles}
      <MaterialThemeProvider>
        <SupabaseConfigVerifier />
        <BrowserRouter>
          <AuthProvider>
            <BreadcrumbProvider>
              <ReactErrorBoundary>
                {isQuickActionInProgress && (
                  <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium">
                    A quick action is in progress. Please wait...
                  </div>
                )}
                <AppRoutes />
                <ThemeNavigationHandler />
                <Toaster />
              </ReactErrorBoundary>
            </BreadcrumbProvider>
          </AuthProvider>
        </BrowserRouter>
      </MaterialThemeProvider>
    </ThemeProvider>
  );
}
