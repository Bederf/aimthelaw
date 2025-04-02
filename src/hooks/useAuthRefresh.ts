import { useEffect } from 'react';

export function useAuthRefresh() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Mark auth refresh in progress
        (window as any).__markAuthRefresh?.(true);
        
        // Reset after a short delay
        setTimeout(() => {
          (window as any).__markAuthRefresh?.(false);
        }, 1000); // 1 second should be enough for auth check
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Cleanup on unmount
      (window as any).__markAuthRefresh?.(false);
    };
  }, []);
} 