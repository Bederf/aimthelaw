/**
 * Type definitions for Lovable Tagger
 * @link https://lovable.dev
 */

interface LovableComponent {
  id: string;
  name: string;
  path: string;
  props: Record<string, any>;
}

interface LovableUpdateRequest {
  componentId: string;
  updates: {
    props?: Record<string, any>;
    styles?: Record<string, string>;
  };
}

interface LovableTagger {
  /**
   * Version of the Lovable Tagger
   */
  version: string;
  
  /**
   * Initialize the tagger with options
   */
  init(options?: {
    debug?: boolean;
    autoDetect?: boolean;
  }): void;
  
  /**
   * Get all detected components
   */
  getComponents(): LovableComponent[];
  
  /**
   * Get a specific component by ID
   */
  getComponent(id: string): LovableComponent | null;
  
  /**
   * Tag a component manually
   */
  tagComponent(element: HTMLElement, name: string, props?: Record<string, any>): void;
  
  /**
   * Callback triggered when Lovable requests UI updates
   */
  onUpdateRequest: ((request: LovableUpdateRequest) => void) | null;
  
  /**
   * Check if Lovable is in design mode
   */
  isDesignMode(): boolean;
}

declare global {
  interface Window {
    LovableTagger?: LovableTagger;
  }
} 