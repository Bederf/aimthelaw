
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define context types
interface AILawyerContextType {
  selectedDocuments: string[];
  toggleDocumentSelection: (documentId: string) => void;
  clearDocumentSelection: () => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  processingAction: string | null;
  setProcessingAction: (action: string | null) => void;
  actionResult: string | null;
  setActionResult: (result: string | null) => void;
}

// Create context with default values
export const AILawyerContext = createContext<AILawyerContextType>({
  selectedDocuments: [],
  toggleDocumentSelection: () => {},
  clearDocumentSelection: () => {},
  isProcessing: false,
  setIsProcessing: () => {},
  processingAction: null,
  setProcessingAction: () => {},
  actionResult: null,
  setActionResult: () => {},
});

// Provider component
export const AILawyerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Function to toggle document selection
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  // Function to clear document selection
  const clearDocumentSelection = () => {
    setSelectedDocuments([]);
  };

  // Context value
  const contextValue: AILawyerContextType = {
    selectedDocuments,
    toggleDocumentSelection,
    clearDocumentSelection,
    isProcessing,
    setIsProcessing,
    processingAction,
    setProcessingAction,
    actionResult,
    setActionResult,
  };

  return (
    <AILawyerContext.Provider value={contextValue}>
      {children}
    </AILawyerContext.Provider>
  );
};

// Custom hook for using the context
export const useAILawyer = () => useContext(AILawyerContext);
