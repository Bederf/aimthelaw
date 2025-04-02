import { useEffect, useState } from 'react';
import { verifySupabaseConfig } from '@/utils/supabaseUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Component that verifies Supabase configuration at startup
 * and displays an alert if there are issues
 */
export function SupabaseConfigVerifier() {
  const [configError, setConfigError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkConfig = async () => {
    // Don't run multiple checks simultaneously
    if (checking) return;
    
    try {
      setChecking(true);
      
      // Force clear any verified flag to ensure fresh check
      sessionStorage.removeItem('supabase_config_verified');
      
      const result = await verifySupabaseConfig();
      if (!result.valid) {
        console.error('Supabase configuration error:', result.message);
        setConfigError(result.message);
      } else {
        // Mark as verified for this session
        sessionStorage.setItem('supabase_config_verified', 'true');
        setConfigError(null);
      }
    } catch (err) {
      console.error('Failed to verify Supabase config:', err);
      setConfigError('Unexpected error verifying Supabase configuration');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check if we already verified configuration in this session
    const verified = sessionStorage.getItem('supabase_config_verified');
    if (verified === 'true') return;
    
    // Run the check
    checkConfig();
    
    // Check again if we come back online after being offline
    const handleOnline = () => {
      checkConfig();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Don't render anything if no error or if dismissed
  if (!configError || dismissed) return null;

  // Check if the error is specifically about Invalid API key
  const isInvalidKeyError = configError.includes('Invalid API key') || 
                           configError.includes('invalid JWT');

  return (
    <Alert className="fixed top-4 right-4 z-50 max-w-md border-red-500 bg-red-50 shadow-lg">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-600">Authentication Configuration Error</AlertTitle>
      <AlertDescription className="text-red-700">
        {configError}
        
        {isInvalidKeyError && (
          <div className="mt-2 text-sm font-medium">
            This is likely due to an expired or invalid Supabase API key.
            <ul className="mt-1 list-disc list-inside">
              <li>Check your .env files for inconsistent API keys</li>
              <li>Ensure the Supabase project is active</li>
              <li>Try restarting the application</li>
            </ul>
          </div>
        )}
        
        <p className="mt-2 text-sm">
          This will prevent login functionality. Please contact the administrator.
        </p>
        
        <div className="mt-3 flex justify-end">
          <Button 
            size="sm" 
            variant="outline" 
            className="mr-2 text-xs h-7"
            disabled={checking}
            onClick={checkConfig}
          >
            {checking ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
      <Button 
        size="sm" 
        variant="ghost" 
        className="absolute right-2 top-2 p-0 h-6 w-6" 
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}

export default SupabaseConfigVerifier; 