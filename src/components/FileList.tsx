import { useEffect, useState } from 'react';
import { TableCell, TableRow, TableHeader, TableHead, Table, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientFile } from '@/types/lawyer/client-view';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Download,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  PaperclipIcon,
  Sparkles,
  Trash2Icon,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UnifiedAIService } from '@/services/unifiedAIService';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { Checkbox } from './ui/checkbox';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';

interface FileListProps {
  files: ClientFile[];
  onFileDeleted: () => void;
  processingFiles?: Set<string>;
  selectedFiles?: string[];
  onFileSelect?: (fileId: string) => void;
}

export function FileList({
  files,
  onFileDeleted,
  processingFiles = new Set<string>(),
  selectedFiles = [],
  onFileSelect,
}: FileListProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ClientFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  
  // Track which files are processing locally as well
  const [localProcessingFiles, setLocalProcessingFiles] = useState<Set<string>>(new Set());
  const [localGeneratingInsights, setLocalGeneratingInsights] = useState<Set<string>>(new Set());
  
  // Combine processing files from props and local state
  const allProcessingFiles = new Set([...processingFiles, ...localProcessingFiles]);
  
  // Sync the processing files prop to local state
  useEffect(() => {
    if (processingFiles) {
      setLocalProcessingFiles(new Set(processingFiles));
    }
  }, [processingFiles]);

  // Get the AI service
  const getAIService = (clientId: string) => {
    return new UnifiedAIService(clientId);
  };
  
  // Handle view
  const handleView = async (file: ClientFile) => {
    try {
      // Get a public URL for the file
      const { data, error } = await supabase.storage
        .from('client-files')
        .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      // Add the document to the local AI service
      const aiService = getAIService(file.client_id);
      aiService.addDocument({
        id: file.id,
        fileName: file.file_name,
        fileUrl: data.signedUrl,
      });

      // Open the URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not open the file. Please try again.',
      });
    }
  };

  // Handle delete
  const handleDeleteClick = (file: ClientFile) => {
    setFileToDelete(file);
    setShowConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      setDeleting(true);

      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('client-files')
        .remove([fileToDelete.file_path]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue anyway to try to delete the database record
      }

      // Delete the file from the database
      const { error: dbError } = await supabase
        .from('client_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: 'File deleted',
        description: `${fileToDelete.file_name} has been deleted.`,
      });

      // Close the dialog and notify parent
      setShowConfirmDelete(false);
      setFileToDelete(null);
      onFileDeleted();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the file. Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Handle download
  const handleDownload = async (file: ClientFile) => {
    try {
      // Get a signed URL for the file
      const { data, error } = await supabase.storage
        .from('client-files')
        .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not download the file. Please try again.',
      });
    }
  };
  
  // Handle generate insights
  const handleGenerateInsights = async (file: ClientFile) => {
    try {
      setLocalGeneratingInsights(prev => new Set([...prev, file.id]));
      
      const res = await api.post('/api/insights/generate', { 
        file_id: file.id,
        client_id: file.client_id 
      });
      
      if (res.status === 202) {
        toast({
          title: 'Document still processing',
          description: 'The document is still being processed. Please try again later.',
        });
        return;
      }
      
      if (res.status === 200) {
        toast({
          title: 'Insights generated',
          description: `Insights successfully generated for ${file.file_name}.`,
        });
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate insights. Please try again.',
      });
    } finally {
      setLocalGeneratingInsights(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else if (fileType.includes('audio') || fileType.includes('mp3') || fileType.includes('wav')) {
      return <FileText className="h-4 w-4 text-purple-500" />;
    } else if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png')) {
      return <FileText className="h-4 w-4 text-green-500" />;
    } else if (fileType.includes('video') || fileType.includes('mp4')) {
      return <FileText className="h-4 w-4 text-orange-500" />;
    } else if (fileType.includes('text') || fileType.includes('txt')) {
      return <FileText className="h-4 w-4 text-gray-500" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };
  
  // Get file status based on the file object
  const getFileStatus = (file: ClientFile) => {
    const isProcessing = allProcessingFiles.has(file.id);
    const status = file.status?.toLowerCase();
    
    if (isProcessing) {
      return {
        label: 'Processing',
        badgeVariant: 'default' as const,
        className: 'gap-1',
        icon: <Loader2 className="h-3 w-3 animate-spin" />
      };
    }
    
    switch (status) {
      case 'processed':
      case 'complete':
        return {
          label: 'Processed',
          badgeVariant: (file.metadata?.has_embeddings === false) ? 'warning' as const : 'success' as const,
          className: 'gap-1',
          icon: <CheckCircle2 className="h-3 w-3" />
        };
      case 'processing':
        return {
          label: 'Processing',
          badgeVariant: 'default' as const,
          className: 'gap-1',
          icon: <Loader2 className="h-3 w-3 animate-spin" />
        };
      case 'error':
        return {
          label: 'Error',
          badgeVariant: 'destructive' as const,
          className: 'gap-1',
          icon: <AlertCircle className="h-3 w-3" />
        };
      case 'partial':
        return {
          label: 'Partial',
          badgeVariant: 'warning' as const,
          className: 'gap-1',
          icon: <AlertCircle className="h-3 w-3" />
        };
      default:
        return {
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
          badgeVariant: 'secondary' as const,
          className: '',
          icon: null
        };
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onFileSelect && (
                <TableHead className="w-[40px]"></TableHead>
              )}
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onFileSelect ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No files found matching the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => {
                const isSelected = selectedFiles.includes(file.id);
                const status = getFileStatus(file);
                
                return (
                  <TableRow 
                    key={file.id} 
                    className={`${isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                  >
                    {onFileSelect && (
                      <TableCell className="w-[40px]">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => onFileSelect(file.id)}
                          aria-label={`Select ${file.file_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_type)}
                        <div className="font-medium max-w-[200px] truncate">{file.file_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DocumentStatusBadge 
                        status={file.status || 'unknown'}
                        documentId={file.id}
                        clientId={file.client_id}
                        hasEmbeddings={file.metadata?.has_embeddings}
                        onReprocessComplete={() => {
                          // Add the file to processing state
                          setLocalProcessingFiles(prev => new Set([...prev, file.id]));
                          
                          // Set a timeout to remove it after 3 seconds (just for UI feedback)
                          setTimeout(() => {
                            setLocalProcessingFiles(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(file.id);
                              return newSet;
                            });
                          }, 3000);
                        }}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(file.file_size ? (file.file_size / 1024 / 1024).toFixed(2) : '?') + ' MB'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {file.created_at ? format(new Date(file.created_at), 'MMM d, yyyy') : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleView(file)}
                          title="View file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownload(file)}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(file)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="h-4 w-4 mr-2" /> Download
                            </DropdownMenuItem>
                            
                            {(file.status === 'processed' || file.status === 'complete') && (
                              <DropdownMenuItem 
                                onClick={() => handleGenerateInsights(file)}
                                disabled={localGeneratingInsights.has(file.id)}
                              >
                                {localGeneratingInsights.has(file.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" /> Generate insights
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(file)}
                            >
                              <Trash2Icon className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{fileToDelete?.file_name}</span>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
