
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
    
    /**
     * Lovable Tagger instance
     */
    LovableTagger?: LovableTagger;
  }
  
  /**
   * Lovable Tagger interface
   */
  interface LovableTagger {
    startObserving: () => void;
    stopObserving: () => void;
    onUpdateRequest: ((data: any) => void) | null;
    getComponents: () => Array<{
      id: string;
      name: string;
      path: string;
      props: Record<string, any>;
    }>;
  }
  
  /**
   * Quick action helper functions exposed for debugging and testing
   */
  const toggleDocumentSelection: (documentId: string) => void;
  const handleQuickAction: (actionType: string) => Promise<any>;
  const getSelectedDocuments: () => string[];
  const processQuickAction: (actionType: string, documentIds?: string[]) => Promise<boolean>;
  
  /**
   * Session storage helper to check if we're in the middle of a quick action
   */
  interface QuickActionState {
    inProgress: boolean;
    action: string | null;
    startTime: number | null;
    documentIds: string[];
  }
  
  let __QUICK_ACTION_STATE: QuickActionState | undefined;
}
