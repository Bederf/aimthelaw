import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/api/apiClient';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface DocumentStatusBadgeProps {
  status: string;
  documentId: string;
  clientId: string;
  hasEmbeddings?: boolean;
  onReprocessComplete?: () => void;
}

export function DocumentStatusBadge({ 
  status, 
  documentId, 
  clientId, 
  hasEmbeddings, 
  onReprocessComplete 
}: DocumentStatusBadgeProps) {
  const { toast } = useToast();
  const [isReprocessing, setIsReprocessing] = React.useState(false);

  const getBadgeVariant = (status: string, hasEmbeddings?: boolean) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return hasEmbeddings === false ? 'warning' : 'success';
      case 'processing':
        return 'default';
      case 'uploaded':
        return 'secondary';
      case 'partial':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getBadgeText = (status: string, hasEmbeddings?: boolean) => {
    if (status?.toLowerCase() === 'processed' && hasEmbeddings === false) {
      return 'Processed (No Embeddings)';
    }
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Unknown';
  };

  const handleReprocessEmbeddings = async () => {
    setIsReprocessing(true);
    
    try {
      const response = await api.reprocessDocumentEmbeddings(documentId, clientId);
      
      if (response.success) {
        toast({
          title: 'Embeddings reprocessing started',
          description: response.message || 'The document is being reprocessed for embeddings',
          variant: 'default'
        });
        
        if (onReprocessComplete) {
          onReprocessComplete();
        }
      } else {
        toast({
          title: 'Failed to reprocess embeddings',
          description: response.error || 'An error occurred while trying to reprocess the document',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error reprocessing document embeddings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reprocess document embeddings',
        variant: 'destructive'
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  // Determine if the reprocess button should be shown
  // Show it if:
  // 1. The document is processed but has no embeddings
  // 2. The document has a partial status
  // 3. The document had an error during processing
  const shouldShowReprocessButton = 
    (status?.toLowerCase() === 'processed' && hasEmbeddings === false) ||
    status?.toLowerCase() === 'partial' ||
    status?.toLowerCase() === 'error';

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getBadgeVariant(status, hasEmbeddings)}>
        {getBadgeText(status, hasEmbeddings)}
      </Badge>
      
      {shouldShowReprocessButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2"
                onClick={handleReprocessEmbeddings}
                disabled={isReprocessing}
              >
                {isReprocessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Reprocess document embeddings
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 