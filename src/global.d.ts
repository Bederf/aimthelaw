// Global type definitions for the application

// Add missing properties to the Window interface
interface Window {
  __HMR_DISABLED?: boolean;
  __HMR_COMPLETELY_DISABLED?: boolean;
  __BLOCK_REFRESH_DURING_QUICK_ACTION?: boolean;
  __QUICK_ACTION_IN_PROGRESS?: boolean;
  __PRESERVE_CONVERSATION_ID?: string | null;
  __original_hmr_listeners?: any[];
  __vite_hmr?: {
    listeners: any[];
  };
  __SUPABASE_CONNECTION: {
    isConnected: boolean;
    isNetworkOnline: boolean;
    lastChecked: number;
    pingTime: number;
    errorMessage?: string;
  };
  safeReload: ((...args: any[]) => boolean);
  showToast?: (options: { title: string; description: string; variant: string }) => void;
} 