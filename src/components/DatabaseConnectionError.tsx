import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatabaseIcon, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';

interface DatabaseConnectionErrorProps {
  onRetry?: () => void;
  detailedError?: string;
  lastAttempt?: Date;
}

const DatabaseConnectionError: React.FC<DatabaseConnectionErrorProps> = ({
  onRetry,
  detailedError,
  lastAttempt
}) => {
  const timeAgo = lastAttempt ? formatTimeAgo(lastAttempt) : '';

  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-destructive/20 rounded-lg">
          <DatabaseIcon className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <AlertTitle className="mb-1 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Database Connection Error
          </AlertTitle>
          <AlertDescription>
            <div className="text-sm space-y-2">
              <p>
                Unable to connect to the database. This could be due to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Network connectivity issues</li>
                <li>Database service unavailability</li>
                <li>Authentication problems</li>
                <li>Firewall or security restrictions</li>
              </ul>
              {detailedError && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono overflow-auto">
                  {detailedError}
                </div>
              )}
              {lastAttempt && (
                <p className="text-xs mt-2">
                  <span className="font-semibold">Last connection attempt:</span> {timeAgo}
                </p>
              )}
              <div className="flex flex-col xs:flex-row gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRetry}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh Page
                </Button>
              </div>
              <div className="mt-2 pt-2 border-t border-destructive/20">
                <p className="text-xs flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  <span>If this problem persists, please contact support.</span>
                </p>
              </div>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

export default DatabaseConnectionError; 