import { useEffect, useState } from 'react';

/**
 * Hook to initialize Lovable Tagger event listeners
 */
export function useLovableEventHooks() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Register Lovable callback handler if available
    if (typeof window !== 'undefined' && window.LovableTagger) {
      console.log('Setting up Lovable Tagger callbacks');
      
      // Handle UI update requests from Lovable
      window.LovableTagger.onUpdateRequest = (data) => {
        console.log('Received UI update request from Lovable:', data);
        // Handle component updates as needed
      };
      
      setIsInitialized(true);
    }
    
    return () => {
      // Cleanup event listeners if needed
      if (typeof window !== 'undefined' && window.LovableTagger) {
        window.LovableTagger.onUpdateRequest = null;
      }
    };
  }, []);

  return { isInitialized };
}

/**
 * Hook to track components identified by Lovable Tagger
 */
export function useLovableComponents() {
  const [components, setComponents] = useState<Array<{
    id: string;
    name: string;
    path: string;
    props: Record<string, any>;
  }>>([]);

  useEffect(() => {
    // Function to refresh components list
    const refreshComponents = () => {
      if (window.LovableTagger) {
        setComponents(window.LovableTagger.getComponents());
      }
    };

    // Set up periodic refresh
    refreshComponents();
    const intervalId = setInterval(refreshComponents, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return { components };
}

/**
 * Hook to manually tag a component for Lovable
 */
export function useLovableTagging(componentName: string, componentId: string) {
  useEffect(() => {
    // Add a data attribute that Lovable can detect
    const element = document.getElementById(componentId);
    if (element) {
      element.setAttribute('data-lovable-component', componentName);
    }
  }, [componentName, componentId]);
} 