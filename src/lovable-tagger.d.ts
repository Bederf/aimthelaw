
declare module 'lovable-tagger' {
  export function componentTagger(): {
    name: string;
    // Add any plugin methods here
  };

  export interface LovableTagger {
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

  global {
    interface Window {
      LovableTagger?: LovableTagger;
      safeReload?: () => void;
      __HMR_COMPLETELY_DISABLED?: boolean;
      __HMR_DISABLED?: boolean;
      __SUPABASE_CONNECTION?: {
        isConnected: boolean;
        isNetworkOnline: boolean;
        lastChecked: number;
        pingTime: number;
        errorMessage?: string;
      };
    }
  }
}
