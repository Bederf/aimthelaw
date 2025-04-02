import React, { useEffect } from 'react';
import { useAILawyer } from '../../context/AILawyerContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from '@/components/ui/use-toast';

// Define keys for session storage flags related to quick actions
const QUICK_ACTION_KEYS = [
  'QUICK_ACTION_IN_PROGRESS',
  'QUICK_ACTION_TYPE',
  'QUICK_ACTION_TIMESTAMP',
  'QUICK_ACTION_SELECTED_DOCS',
  'PRESERVE_PAGE_STATE',
  'PRESERVE_AUTH_STATE' // Add any other relevant keys here
];

export const ResultDialog: React.FC = React.memo(() => {
  const { 
    lastQuickActionResult, 
    showResultDialog, 
    setShowResultDialog 
  } = useAILawyer();
  
  const { toast } = useToast();
  
  // Clean up all quick action flags when dialog is shown or closed
  useEffect(() => {
    const cleanupQuickActionFlags = () => {
      console.log('Cleaning up all quick action flags');
      
      // Use setTimeout to ensure this runs after other operations
      setTimeout(() => {
        // Clear all quick action related flags from session storage
        QUICK_ACTION_KEYS.forEach(key => {
          try {
            if (sessionStorage.getItem(key)) {
              console.log(`Removing session storage flag: ${key}`);
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            console.error(`Error removing ${key} from session storage:`, e);
          }
        });
        
        // Also clear window-level flags if they exist
        try {
          if ((window as any).__QUICK_ACTION_IN_PROGRESS) {
            console.log('Clearing window-level quick action flag');
            (window as any).__QUICK_ACTION_IN_PROGRESS = false;
          }
          if ((window as any).__HMR_DISABLED) {
            console.log('Re-enabling HMR');
            (window as any).__HMR_DISABLED = false;
          }
        } catch (e) {
          console.error('Error clearing window-level flags:', e);
        }
        
        // Dispatch an event to notify other components that quick action is done
        try {
          window.dispatchEvent(new CustomEvent('quick-action-completed'));
        } catch (e) {
          console.error('Error dispatching quick-action-completed event:', e);
        }
      }, 100); // Short delay to ensure this runs after other operations
    };

    // Initial cleanup on mount
    cleanupQuickActionFlags();

    // Re-run cleanup whenever showResultDialog changes (when dialog is shown/hidden)
    if (showResultDialog) {
      cleanupQuickActionFlags();
    }

    return cleanupQuickActionFlags; // Cleanup on unmount as well
  }, [showResultDialog]);
  
  // Handle dialog close with cleanup
  const handleClose = () => {
    console.log('ResultDialog: Closing dialog and cleaning up');
    
    // First ensure all flags are cleaned up with a slight delay
    setTimeout(() => {
      QUICK_ACTION_KEYS.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.error(`Error removing ${key} from session storage:`, e);
        }
      });
      
      // Then close the dialog
      setShowResultDialog(false);
    }, 100);
  };
  
  if (!lastQuickActionResult) {
    return null;
  }
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(lastQuickActionResult?.content || "");
    toast({
      title: "Copied to clipboard",
      description: "The result has been copied to your clipboard.",
      duration: 3000,
    });
  };
  
  return (
    <Dialog open={showResultDialog} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lastQuickActionResult?.name || "Quick Action"} Results
          </DialogTitle>
          <DialogDescription>
            {lastQuickActionResult?.name === "Extract Dates" 
              ? "Important dates extracted from your selected documents"
              : "Results from the most recent quick action"}
          </DialogDescription>
        </DialogHeader>
        
        {lastQuickActionResult?.name === "Extract Dates" && (
          <div className="mt-2 mb-4">
            <Alert variant="default" className="bg-muted/50">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <AlertTitle>Date Extraction Complete</AlertTitle>
              <AlertDescription>
                All dates have been extracted from your documents and added to the chat.
                You can view them below or in your chat history.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <div className="mt-4 border rounded-md p-4 bg-card">
          <div className="prose dark:prose-invert max-w-none">
            {lastQuickActionResult?.content ? (
              <>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Enhance headings with better styling
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                    // Add better styling for lists
                    ul: ({ node, ...props }) => <ul className="my-3 list-disc pl-6" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-3 list-decimal pl-6" {...props} />,
                    // Improve code block styling
                    code: ({ node, inline, ...props }) => 
                      inline ? <code className="px-1 py-0.5 bg-muted rounded text-sm" {...props} /> 
                            : <pre className="p-3 bg-muted rounded-md overflow-x-auto text-sm" {...props} />,
                  }}
                >
                  {lastQuickActionResult.content}
                </ReactMarkdown>
                
                {/* If the content contains JSON that wasn't properly formatted, show a cleaner fallback */}
                {lastQuickActionResult.content.includes('{') && 
                 lastQuickActionResult.content.includes('}') && 
                 lastQuickActionResult.content.includes('"overview"') && (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      JSON Content Detected
                    </p>
                    <p className="text-sm mt-1 text-amber-700 dark:text-amber-400">
                      The summary contains structured data that might not be displaying optimally. 
                      The content has been included in the chat history and saved to your conversation.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <p className="font-medium text-base">No content was returned for this action.</p>
                <p className="text-sm mt-2">
                  The action may have completed successfully, but the content couldn't be displayed.
                </p>
                {lastQuickActionResult?.name === "Summarize Document" && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Summarization Completed
                    </p>
                    <p className="text-sm mt-1 text-amber-700 dark:text-amber-400">
                      The summary may be available in the chat interface. You can close this dialog and check your chat history.
                    </p>
                    <p className="text-sm mt-2 text-amber-700 dark:text-amber-400">
                      This issue can occur when the backend returns an unstructured response. The developers have been notified about this issue.
                    </p>
                  </div>
                )}
                <p className="text-sm mt-4">
                  If this issue persists, try selecting different documents or try again later.
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Completed at: {new Date(lastQuickActionResult?.timestamp || new Date()).toLocaleString()}</p>
          {lastQuickActionResult?.documentIds && (
            <p>Document count: {lastQuickActionResult.documentIds.length}</p>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={handleClose}>Close</Button>
          <Button 
            onClick={handleCopyToClipboard}
            variant="outline"
          >
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Add display name for better debugging
ResultDialog.displayName = 'ResultDialog'; 