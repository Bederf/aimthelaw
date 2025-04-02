import React, { useState, useEffect } from 'react';
import { useAILawyer } from '../context/AILawyerContext';
import { Document } from '@/types/ai';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, Circle, FileText } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';

export function DocumentSelector() {
  const { 
    clientId,
    clientFiles, 
    selectedFiles,
    toggleDocumentSelection,
    sidebarOpen,
    setSidebarOpen
  } = useAILawyer();
  
  const { toast } = useToast();
  const [validSelection, setValidSelection] = useState<boolean>(true);
  
  // Check if we're in an actual AI Lawyer page context
  const isAILawyerPage = window.location.pathname.includes('/lawyer/ai') || 
                         window.location.pathname.includes('/lawyer/ai-new');
  
  // Early return with minimal UI if not on AI Lawyer page
  if (!isAILawyerPage) {
    return null;
  }
  
  // Debug logging to help diagnose issues
  useEffect(() => {
    console.log('[DocumentSelector] Rendered with:', {
      clientFilesCount: clientFiles.length,
      selectedFilesCount: selectedFiles.length,
      sidebarOpen,
      clientId,
      isAILawyerPage
    });
    
    if (clientFiles.length > 0) {
      console.log('[DocumentSelector] Available files:', 
        clientFiles.map(f => ({ id: f.id, name: f.file_name || f.title, type: f.file_type, source: f.source })));
    } else if (isAILawyerPage) {
      // Only show the warning if we're actually on an AI Lawyer page
      console.warn('[DocumentSelector] No client files available to display');
    }
    
    // Validate selected files against available client files
    if (selectedFiles.length > 0 && clientFiles.length > 0) {
      const invalidSelections = selectedFiles.filter(selectedFile => {
        const selectedId = typeof selectedFile === 'string' ? selectedFile : selectedFile.id;
        return !clientFiles.some(clientFile => clientFile.id === selectedId);
      });
      
      if (invalidSelections.length > 0) {
        console.warn('[DocumentSelector] Found invalid file selections:', invalidSelections);
        setValidSelection(false);
        
        toast({
          title: "Invalid File Selection",
          description: `${invalidSelections.length} selected file(s) cannot be found in the available files. This may cause errors with quick actions.`,
          variant: "warning",
          duration: 8000,
        });
      } else {
        setValidSelection(true);
      }
    }
  }, [clientFiles, selectedFiles, sidebarOpen, clientId, toast, isAILawyerPage]);
  
  // Helper to check if a file is selected
  const isFileSelected = (fileId: string) => {
    return selectedFiles.some(file => 
      typeof file === 'string' ? file === fileId : file.id === fileId
    );
  };
  
  // Force refresh client files - useful for testing
  const handleForceRefresh = () => {
    console.log('[DocumentSelector] Triggering a page refresh to reload files');
    // Reload the page to fetch fresh data
    if (window.safeReload) {
      window.safeReload();
    } else {
      window.location.reload();
    }
  };
  
  if (!sidebarOpen) {
    return (
      <div className="w-10 border-r h-full bg-muted/30 flex flex-col items-center py-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0 rounded-full"
          onClick={() => {
            console.log('[DocumentSelector] Opening sidebar');
            setSidebarOpen(true);
          }}
        >
          <FileText className="h-4 w-4" />
          <span className="sr-only">Open document panel</span>
        </Button>
      </div>
    );
  }
  
  // Determine file display status for alert message
  const noFiles = clientFiles.length === 0;
  const filesLoaded = !noFiles;
  const hasInvalidSelections = !validSelection && selectedFiles.length > 0;
  
  return (
    <div className="w-full md:w-72 lg:w-72 border-r flex flex-col h-full overflow-hidden">
      <div className="p-2 flex justify-between items-center border-b">
        <div className="font-medium text-sm">Documents</div>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="h-6 w-6 p-0">
          <span className="sr-only">Close sidebar</span>
          &times;
        </Button>
      </div>
      
      {hasInvalidSelections && (
        <div className="p-2 bg-amber-50 border-b border-amber-200">
          <Alert variant="warning" className="py-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-xs">Attention Required</AlertTitle>
            <AlertDescription className="text-xs">
              Some selected files cannot be found in the document list. This may cause errors with actions.
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 text-xs w-full"
                onClick={() => {
                  // Clear invalid selections
                  selectedFiles.forEach(file => {
                    const fileId = typeof file === 'string' ? file : file.id;
                    if (!clientFiles.some(cf => cf.id === fileId)) {
                      toggleDocumentSelection(fileId);
                    }
                  });
                }}
              >
                Clear Invalid Selections
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {noFiles ? (
        <div className="p-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No documents available</AlertTitle>
            <AlertDescription>
              <div className="mb-2">There are no documents available for this client.</div>
              <div className="text-xs text-muted-foreground">
                <p className="mb-1">This could be because:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No documents have been uploaded for this client yet</li>
                  <li>The documents are stored in a different location</li>
                  <li>The client ID might be incorrect</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex mt-4 justify-center">
            <Button 
              variant="default" 
              size="sm" 
              className="text-xs"
              onClick={handleForceRefresh}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-y-auto h-full">
          <div className="p-2">
            <div className="mb-2 text-xs text-muted-foreground flex justify-between items-center px-2">
              <span>{clientFiles.length} documents available</span>
              <span>{selectedFiles.length} selected</span>
            </div>
            
            <ul className="space-y-1">
              {clientFiles.map(file => (
                <li key={file.id} className="relative">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-start hover:bg-muted/50 ${
                      isFileSelected(file.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      console.log(`[DocumentSelector] Toggling selection for file: ${file.id} - ${file.file_name || file.title}`);
                      toggleDocumentSelection(file.id);
                    }}
                  >
                    <span className="mr-2 mt-0.5 flex-shrink-0">
                      {isFileSelected(file.id) ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 overflow-hidden text-ellipsis">
                      {file.title || file.file_name || 'Unnamed document'}
                      <span className="block text-xs text-muted-foreground mt-0.5 flex items-center">
                        {new Date(file.created_at).toLocaleDateString()}
                        {file.file_type && (
                          <span className="ml-1 px-1 bg-muted rounded text-[10px]">
                            {file.file_type.split('/')[1] || file.file_type}
                          </span>
                        )}
                        {file.source === 'embeddings' && (
                          <span className="ml-1 px-1 bg-blue-100 text-blue-800 rounded text-[10px] flex items-center">
                            <Info className="h-2 w-2 mr-0.5" />
                            embedding
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      )}
      
      {filesLoaded && selectedFiles.length > 0 && (
        <div className="p-3 border-t bg-muted/20">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              console.log('[DocumentSelector] Clearing all selected files');
              selectedFiles.forEach(file => {
                const fileId = typeof file === 'string' ? file : file.id;
                toggleDocumentSelection(fileId);
              });
            }}
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
} 