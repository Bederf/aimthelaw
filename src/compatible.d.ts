
// Type definitions for compatible mode

// Define WebSocket types to avoid errors
declare class WebSocket {
  constructor(url: string, protocols?: string | string[]);
  send(data: any): void;
  close(): void;
  onmessage?: (event: { data: any }) => void;
  onerror?: (event: any) => void;
  onclose?: () => void;
  onopen?: () => void;
}

// Define WebSocketServer for our mock implementation
declare class WebSocketServer {
  constructor(options: { noServer: boolean; path: string });
  handleUpgrade(request: any, socket: any, head: any, callback: Function): void;
  on(event: string, callback: Function): this;
  emit(event: string, ...args: any[]): boolean;
}

// Define globals that might be used in compatible mode
interface Window {
  WebSocket: typeof WebSocket;
  LovableTagger?: {
    startObserving: () => void;
    stopObserving: () => void;
    onUpdateRequest: ((data: any) => void) | null;
    getComponents: () => any[];
  };
  __HMR_COMPLETELY_DISABLED?: boolean;
  __HMR_DISABLED?: boolean;
}

// Make TypeScript aware of the dynamic import
declare module 'lovable-tagger/dist/lovable-tagger.js';
