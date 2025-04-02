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
    
    // Clean up
    return () => clearInterval(intervalId);
  }, []);

  // Initial app setup - occurs once at startup
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Starting application initialization...');
      
      // Step 1: Apply global styles
      try {
        globalStyles();
        console.log('Global styles applied successfully');
      } catch (stylesError) {
        console.warn('Error applying global styles:', stylesError);
      }
      
      // Step 2: Apply theme from cached settings if available
      try {
        console.log('Initializing application theme...');
        
        // First try to load and apply the theme for the current path
        try {
          await themeService.applyThemeForCurrentPath();
          console.log('Successfully initialized theme from configuration');
        } catch (themePathError) {
          console.warn('Error applying theme for path:', themePathError);
          
          // Fallback - apply a default theme to prevent unstyled content
          try {
            await themeService.applyTheme('winter');
            console.log('Applied emergency fallback theme');
          } catch (fallbackError) {
            console.error('Critical theme application error:', fallbackError);
            
            // Last resort - set critical CSS variables directly
            document.documentElement.style.setProperty('--background', '0 0% 100%');
            document.documentElement.style.setProperty('--foreground', '224 71.4% 4.1%');
            document.documentElement.setAttribute('data-theme', 'winter');
          }
        }
      } catch (error) {
        console.error('Error during theme initialization:', error);
      }
      
      // Mark initialization as complete
      console.log('Application initialization complete');
      setIsInitialized(true);
    };

    initializeApp();
  }, []);

  // Add error boundary for the entire app
  if (!isInitialized) {
    // Return a minimal loading state
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        color: '#1e293b',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            marginBottom: '0.5rem' 
          }}>
            Loading application...
          </div>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            backgroundColor: '#e2e8f0', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: '30%', 
              height: '100%', 
              backgroundColor: '#3b82f6',
              animation: 'loading 1.5s infinite ease-in-out',
            }}></div>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; margin-left: 0; }
            50% { width: 30%; margin-left: 70%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // Special UI for quick action in progress
  if (isQuickActionInProgress) {
    // Use the main app structure but with a flag to prevent complex re-renders
    return (
      <BrowserRouter>
        <ThemeProvider defaultMode="light" defaultVariant="default" applyTheme={false}>
          <MaterialThemeProvider mode="light" variant="default">
            <AuthProvider>
              <div className="quick-action-in-progress">
                <ReactErrorBoundary>
                  <div className="min-h-screen bg-background">
                    <AppRoutes />
                    <Toaster />
                  </div>
                </ReactErrorBoundary>
              </div>
            </AuthProvider>
          </MaterialThemeProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ReactErrorBoundary>
        <ThemeProvider>
          <MaterialThemeProvider mode="light" variant="default">
            <AuthProvider>
              <BreadcrumbProvider>
                <ThemeNavigationHandler />
                <SupabaseConfigVerifier />
                <AppRoutes />
                <Toaster />
              </BreadcrumbProvider>
            </AuthProvider>
          </MaterialThemeProvider>
        </ThemeProvider>
      </ReactErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
