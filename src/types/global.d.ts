/**
 * Global type declarations for the application
 */

export {};

declare global {
  interface Window {
    /**
     * Flag to disable HMR during quick actions
     */
    __HMR_DISABLED?: boolean;
    
    /**
     * Function to show toast notifications, made available globally
     */
    showToast?: (options: { 
      title: string; 
      description: string; 
      variant: string;
      duration?: number;
    }) => void;
    
    /**
     * Supabase connection information
     */
    __SUPABASE_CONNECTION?: {
      isConnected: boolean;
      isNetworkOnline: boolean;
      lastChecked: number;
      pingTime: number;
      errorMessage?: string;
    };
  }
}

export {};

declare global {
  interface Window {
    /**
     * Flag to disable HMR during quick actions
     */
    __HMR_DISABLED?: boolean;
    
    /**
     * Function to show toast notifications, made available globally
     */
    showToast?: (options: { 
      title: string; 
      description: string; 
      variant: string;
      duration?: number;
    }) => void;
    
    /**
     * Supabase connection information
     */
    __SUPABASE_CONNECTION?: {
      isConnected: boolean;
      isNetworkOnline: boolean;
      lastChecked: number;
      pingTime: number;
      errorMessage?: string;
    };
    
    /**
     * Quick action helper functions exposed for debugging and testing
     */
    toggleDocumentSelection?: (documentId: string) => void;
    handleQuickAction?: (actionType: string) => Promise<any>;
    getSelectedDocuments?: () => string[];
    processQuickAction?: (actionType: string, documentIds?: string[]) => Promise<boolean>;
    
    /**
     * Session storage helper to check if we're in the middle of a quick action
     */
    __QUICK_ACTION_STATE?: {
      inProgress: boolean;
      action: string | null;
      startTime: number | null;
      documentIds: string[];
    };
  }
} 