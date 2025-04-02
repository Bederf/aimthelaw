import React, { createContext, useContext, useEffect } from 'react';
import { Original as OriginalAILawyerProvider } from './features/aiLawyer/context/AILawyerContext';

// Import our Lovable hook
import { useLovableEventHooks } from '../lovable.hooks';

// Create a wrapper component that adds Lovable functionality
export const LovableAILawyerProvider: React.FC<{
  children: React.ReactNode;
  clientId: string;
}> = ({ children, clientId }) => {
  // Use the Lovable event hooks
  useLovableEventHooks();
  
  // Use the original provider for all existing functionality
  return (
    <OriginalAILawyerProvider clientId={clientId}>
      {children}
    </OriginalAILawyerProvider>
  );
};

export const useLovableDemo = () => {
  useEffect(() => {
    console.log('Lovable AI Lawyer Context is active');
    
    // Example of tagging components for Lovable
    setTimeout(() => {
      if (window.LovableTagger) {
        console.log('Components detected by Lovable:', 
          window.LovableTagger.getComponents().length);
      }
    }, 2000);
  }, []);
  
  return { isLovableEnabled: true };
}; 