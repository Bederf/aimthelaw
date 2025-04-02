
// Type definitions for Lovable Tagger

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
