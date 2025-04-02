import { useState, useCallback, useEffect } from 'react';
import { Document } from '@/types/ai';

export interface UseDocumentSelectionOptions {
  clientId: string;
  clientFiles: Document[];
}

export function useDocumentSelection({ clientId, clientFiles }: UseDocumentSelectionOptions) {
  const [selectedFiles, setSelectedFiles] = useState<(string | Document)[]>([]);
  
  // Initialize from session storage if available
  useEffect(() => {
    if (!clientId) return;
    
    try {
      const storedFiles = sessionStorage.getItem('SELECTED_FILES') || 
                          sessionStorage.getItem(`selected_documents_${clientId}`);
                          
      if (storedFiles) {
        const parsedFiles = JSON.parse(storedFiles);
        setSelectedFiles(parsedFiles);
        console.log(`[useDocumentSelection] Loaded ${parsedFiles.length} selected files from session storage`);
      }
    } catch (e) {
      console.error("[useDocumentSelection] Error loading stored document selection:", e);
    }
    
    // Add event listener for custom clear-document-selection event
    const handleClearSelection = () => {
      console.log('[useDocumentSelection] Clearing document selection via custom event');
      setSelectedFiles([]);
    };
    
    window.addEventListener('clear-document-selection', handleClearSelection);
    
    return () => {
      window.removeEventListener('clear-document-selection', handleClearSelection);
    };
  }, [clientId]);
  
  const toggleDocumentSelection = useCallback((id: string) => {
    console.log(`[toggleDocumentSelection] Toggle selection for document ID: ${id}`);
    
    // Find the complete file object from clientFiles
    const fileObj = clientFiles.find(file => file.id === id);
    if (!fileObj) {
      console.warn(`[toggleDocumentSelection] File with ID ${id} not found in clientFiles`);
    }
    
    // Use the full file object if available, otherwise just use the ID
    const fileToToggle = fileObj || { 
      id,
      title: '',
      file_name: '',
      file_type: '',
      file_size: 0,
      created_at: new Date().toISOString(),
      is_training_doc: false,
      type: 'client'
    };
    
    setSelectedFiles((prev: (string | Document)[]) => {
      // Check if the file is already selected by ID
      const isSelected = prev.some(file => 
        typeof file === 'string' ? file === id : file.id === id
      );
      
      // Handle selection or deselection
      if (isSelected) {
        // Remove the file from selection
        const newSelection = prev.filter(file => 
          typeof file === 'string' ? file !== id : file.id !== id
        );
        
        // Store in session storage immediately
        try {
          const simplifiedFiles = newSelection.map(file => {
            if (typeof file === 'string') return { id: file };
            return {
              id: file.id,
              title: file.title || file.file_name || file.name,
              file_name: file.file_name || file.name,
              file_type: file.file_type || file.type,
              file_size: file.file_size || file.size,
              created_at: file.created_at || file.uploadedAt,
              is_training_doc: false,
              type: 'client'
            };
          });
          
          sessionStorage.setItem('SELECTED_FILES', JSON.stringify(simplifiedFiles));
          if (clientId) {
            sessionStorage.setItem(`selected_documents_${clientId}`, JSON.stringify(simplifiedFiles));
          }
          console.log(`[toggleDocumentSelection] Deselected document, saved ${simplifiedFiles.length} files to session storage`);
        } catch (e) {
          console.error("[toggleDocumentSelection] Error saving to session storage:", e);
        }
        
        return newSelection;
      } else {
        // Add the file to selection
        const newSelection = [...prev, fileToToggle];
        
        // Store in session storage immediately
        try {
          const simplifiedFiles = newSelection.map(file => {
            if (typeof file === 'string') return { id: file };
            return {
              id: file.id,
              title: typeof file === 'string' ? '' : (file.title ?? file.file_name ?? ''),
              file_name: typeof file === 'string' ? '' : (file.file_name ?? ''),
              file_type: typeof file === 'string' ? '' : (file.file_type ?? ''),
              file_size: typeof file === 'string' ? 0 : (file.file_size ?? 0),
              created_at: typeof file === 'string' ? new Date().toISOString() : (file.created_at ?? new Date().toISOString()),
              is_training_doc: false,
              type: 'client'
            };
          });
          
          sessionStorage.setItem('SELECTED_FILES', JSON.stringify(simplifiedFiles));
          if (clientId) {
            sessionStorage.setItem(`selected_documents_${clientId}`, JSON.stringify(simplifiedFiles));
          }
          console.log(`[toggleDocumentSelection] Selected document, saved ${simplifiedFiles.length} files to session storage`);
        } catch (e) {
          console.error("[toggleDocumentSelection] Error saving to session storage:", e);
        }
        
        return newSelection;
      }
    });
  }, [clientFiles, clientId]);

  const getSelectedDocumentIds = useCallback((): string[] => {
    return selectedFiles
      .map(file => typeof file === 'string' ? file : file.id)
      .filter(id => id && typeof id === 'string');
  }, [selectedFiles]);
  
  return {
    selectedFiles,
    setSelectedFiles,
    toggleDocumentSelection,
    getSelectedDocumentIds
  };
} 