import React, { useState, useEffect } from 'react';
import { useAILawyer } from '../../context/AILawyerContext';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  FileText, 
  SendHorizontal, 
  ScaleIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

// Define available quick actions
const QUICK_ACTIONS = [
  {
    id: 'Extract Dates',
    label: 'Extract Dates',
    description: 'Extract important dates from selected documents',
    icon: Calendar
  },
  {
    id: 'Summarize Document',
    label: 'Summarize',
    description: 'Create a summary of selected documents',
    icon: FileText
  },
  {
    id: 'Reply to Letter',
    label: 'Reply to Letter',
    description: 'Generate a reply to a letter (requires exactly one document)',
    icon: SendHorizontal,
    singleDocumentOnly: true
  },
  {
    id: 'Prepare for Court',
    label: 'Prepare for Court',
    description: 'Analyze documents to prepare for court proceedings',
    icon: ScaleIcon
  }
];

// Special event handler function with aggressive prevention
function preventNavigation(e: React.MouseEvent | React.SyntheticEvent) {
  if (e) {
    // Every possible method to prevent navigation/refresh
    e.preventDefault();
    e.stopPropagation();
    if ('stopImmediatePropagation' in e) {
      (e as any).stopImmediatePropagation();
    }
    if ('cancelBubble' in e) {
      (e as any).cancelBubble = true;
    }
    if ('returnValue' in e) {
      (e as any).returnValue = false;
    }
  }
  return false;
}

export const QuickActionsPanel: React.FC = React.memo(() => {
  const { 
    handleQuickAction,
    quickActionLoading,
    isInQuickAction,
    clientFiles,
    selectedFiles,
    getSelectedDocumentIds,
    conversationId,
    clientId,
    messages
  } = useAILawyer();
  
  const { toast } = useToast();
  
  // State for validating files
  const [validFiles, setValidFiles] = useState<boolean>(clientFiles.length > 0);
  
  // Get the selected document IDs directly from the context
  const selectedDocumentIds = getSelectedDocumentIds();
  
  const hasSelectedDocuments = selectedDocumentIds.length > 0;
  
  // Helper function to get all messages from the context
  const getAllMessages = () => {
    // Return messages from context
    return messages || [];
  };
  
  // Log some debug info for tracking issues
  useEffect(() => {
    console.log('QuickActionsPanel rendering with:', {
      clientId,
      conversationId,
      isLoading: !!quickActionLoading,
      selectedDocs: selectedDocumentIds.length,
      totalFiles: clientFiles.length,
      selectedDocumentIds,
      selectedFiles
    });
    
    // Log detailed information about file selection
    if (selectedDocumentIds.length > 0) {
      console.log('Selected document IDs:', selectedDocumentIds);
      console.log('Selected files from context:', selectedFiles);
      
      // Check if all selected IDs exist in client files
      const missingFiles = selectedDocumentIds.filter(id => 
        !clientFiles.some(file => file.id === id)
      );
      
      if (missingFiles.length > 0) {
        console.warn('Some selected files are missing from clientFiles:', missingFiles);
      }
    }
  }, [clientId, conversationId, quickActionLoading, selectedDocumentIds, clientFiles, selectedFiles]);
  
  // Validate that selected files exist in clientFiles
  useEffect(() => {
    if (selectedDocumentIds.length === 0) {
      // If no documents are selected, set validFiles based on whether client files exist
      setValidFiles(clientFiles.length > 0);
      return;
    }
    
    // Check if all selected files exist in clientFiles
    const allValid = selectedDocumentIds.every(id => 
      clientFiles.some(file => file.id === id)
    );
    
    console.log('[QuickActionsPanel] File validation:', {
      selectedDocumentIds,
      clientFilesCount: clientFiles.length,
      allValid
    });
    
    setValidFiles(allValid);
  }, [selectedDocumentIds, clientFiles]);
  
  // Enhanced click handler for maximum prevention of navigation
  const handleQuickActionClick = (action: string, e: React.MouseEvent<HTMLButtonElement>) => {
    console.log(`Handling quick action click: ${action}`);
    
    // Immediately prevent all default behaviors
    preventNavigation(e);
    
    // Call the actual quick action handler
    handleQuickAction(action, e);
    
    return false; // For good measure, prevent again
  };
  
  // Render the updated quick actions panel - now with a single row, no scrolling
  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex gap-2 px-2">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          
          // Determine if this action should be disabled
          const isDisabled = 
            !hasSelectedDocuments || 
            (action.singleDocumentOnly && selectedDocumentIds.length !== 1);
          
          // Show loading state
          const isLoading = quickActionLoading === action.id;
          
          return (
            <TooltipProvider key={action.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisabled === true || isLoading}
                    data-quick-action={action.id}
                    data-no-navigation="true"
                    className="quick-action-button flex items-center justify-center whitespace-nowrap"
                    onClick={(e) => handleQuickActionClick(action.id, e)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-xs sm:text-sm">
                      {isLoading ? 'Processing...' : action.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <p className="max-w-xs text-xs">{action.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
});

// Add display name for better debugging
QuickActionsPanel.displayName = 'QuickActionsPanel'; 