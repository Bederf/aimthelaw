import { FileList } from '@/components/FileList';
import { Card } from '@/components/ui/card';
import { DocumentCategory, ClientFile } from '@/types/lawyer/client-view';
import { FileUpload } from '@/components/FileUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FolderIcon, RefreshCw } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FileSectionProps {
  clientId: string;
  files: ClientFile[];
  category: DocumentCategory | null;
  onUploadComplete: (fileIds: string[]) => void;
  onFileDeleted: () => void;
  selectedFiles?: string[];
  onFileSelect?: (fileId: string) => void;
  showTabs?: boolean;
  onCategoryChange?: (category: DocumentCategory | null) => void;
  processingFiles?: Set<string>;
}

export function FileSection({
  clientId,
  files,
  category,
  onUploadComplete,
  onFileDeleted,
  selectedFiles = [],
  onFileSelect,
  showTabs = true,
  onCategoryChange,
  processingFiles = new Set()
}: FileSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filteredFiles, setFilteredFiles] = useState<ClientFile[]>(files);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Better file organization - group by type and status
  const fileGroups = {
    recent: files.slice(0, 5),
    processed: files.filter(f => f.status === 'processed'),
    processing: files.filter(f => processingFiles.has(f.id) || f.status === 'processing'),
    failed: files.filter(f => f.status === 'failed' || f.status === 'processing_failed'),
  };

  // Group files by category
  const filesByCategory = files.reduce((acc, file) => {
    // If no category, use file type as category
    const cat = file.category || 
      (file.file_type.includes('pdf') ? 'pdf_documents' : 
       file.file_type.includes('doc') ? 'word_documents' :
       file.file_type.includes('audio') ? 'audio_files' : 'other');
    
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(file);
    return acc;
  }, {} as Record<string, ClientFile[]>);

  // Update filtered files when category or files change
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredFiles(files);
    } else if (activeCategory === 'processing') {
      setFilteredFiles(fileGroups.processing);
    } else if (activeCategory === 'processed') {
      setFilteredFiles(fileGroups.processed);
    } else {
      setFilteredFiles(filesByCategory[activeCategory] || []);
    }
  }, [activeCategory, files, processingFiles]);

  // Notify parent component about category change
  useEffect(() => {
    if (onCategoryChange && activeCategory !== 'all' && activeCategory !== 'processing' && activeCategory !== 'processed') {
      const selectedCategory = {
        category: activeCategory,
        subcategory: null
      } as DocumentCategory;
      onCategoryChange(selectedCategory);
    } else if (onCategoryChange && (activeCategory === 'all' || activeCategory === 'processing' || activeCategory === 'processed')) {
      onCategoryChange(null);
    }
  }, [activeCategory, onCategoryChange]);

  // Function to refresh files
  const refreshFiles = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Verify files belong to this client
      const validFiles = data?.filter(file => file.client_id === clientId);
      
      if (data?.length !== validFiles?.length) {
        console.warn(`Found ${data?.length || 0} files but only ${validFiles?.length || 0} match client_id ${clientId}`);
      }
      
      // Process the files
      const processedFiles = validFiles.map(file => ({
        id: file.id?.toString() ?? '',
        file_name: file.file_name?.toString() ?? '',
        file_path: file.file_path?.toString() ?? '',
        file_type: file.file_type?.toString() ?? '',
        file_size: typeof file.file_size === 'number' ? file.file_size : 0,
        category: file.category?.toString(),
        created_at: file.created_at?.toString() ?? new Date().toISOString(),
        updated_at: file.updated_at?.toString() ?? new Date().toISOString(),
        lawyer_id: file.lawyer_id?.toString() ?? '',
        client_id: file.client_id?.toString() ?? '',
        status: file.status?.toString() ?? ''
      }));
      
      // Update the local files state
      setFilteredFiles(processedFiles);
      
      toast({
        title: "Files Refreshed",
        description: `Found ${processedFiles.length} files for this client`
      });
      
    } catch (error) {
      console.error('Error refreshing files:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh file list"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [clientId, toast]);

  // Handle upload complete
  const handleUploadComplete = useCallback(async (fileIds: string[]) => {
    // Pass the fileIds to the parent component
    if (onUploadComplete) {
      onUploadComplete(fileIds);
    }
  }, [onUploadComplete]);

  // Get fancy category names for display
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'all': 'All Files',
      'processed': 'Ready for AI',
      'processing': 'Processing',
      'pdf_documents': 'PDF Documents',
      'word_documents': 'Word Documents',
      'audio_files': 'Audio Files',
      'legal_documents': 'Legal Documents',
      'financial_records': 'Financial Records',
      'correspondence': 'Correspondence',
      'evidence': 'Evidence',
      'court_filings': 'Court Filings',
      'personal_documents': 'Personal Documents',
      'other': 'Other Files'
    };
    
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
          <p className="text-sm text-muted-foreground">
            Upload documents related to this client. Supported formats: PDF, DOCX, MP3, WAV, OGG
          </p>
        </div>
        <FileUpload
          clientId={clientId}
          onUploadComplete={handleUploadComplete}
          category={category?.category}
          subcategory={category?.subcategory}
        />
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Client Documents</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-sm text-muted-foreground">
                {files.length} document{files.length !== 1 ? 's' : ''} uploaded
              </p>
              
              {fileGroups.processing.length > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {fileGroups.processing.length} processing
                </Badge>
              )}
              
              {selectedFiles.length > 0 && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  {selectedFiles.length} selected
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshFiles} 
              disabled={isRefreshing}
              className="flex items-center"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Files
                </>
              )}
            </Button>
          </div>
        </div>

        {files.length > 0 ? (
          <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveCategory}>
            <TabsList className="overflow-auto pb-1 flex flex-nowrap" style={{ maxWidth: '100%' }}>
              <TabsTrigger value="all" className="flex items-center">
                <FolderIcon className="h-4 w-4 mr-2" />
                All Files ({files.length})
              </TabsTrigger>
              
              {fileGroups.processed.length > 0 && (
                <TabsTrigger value="processed" className="flex items-center">
                  Ready ({fileGroups.processed.length})
                </TabsTrigger>
              )}
              
              {fileGroups.processing.length > 0 && (
                <TabsTrigger value="processing" className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing ({fileGroups.processing.length})
                </TabsTrigger>
              )}
              
              <Separator orientation="vertical" className="mx-1 h-4" />
              
              {Object.entries(filesByCategory)
                .filter(([cat]) => cat !== 'other' && filesByCategory[cat].length > 0)
                .sort((a, b) => b[1].length - a[1].length) // Sort by count, descending
                .map(([cat, files]) => (
                  <TabsTrigger key={cat} value={cat} className="flex items-center whitespace-nowrap">
                    {getCategoryDisplayName(cat)} ({files.length})
                  </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value={activeCategory}>
              <FileList
                files={filteredFiles}
                onFileDeleted={onFileDeleted}
                selectedFiles={selectedFiles}
                onFileSelect={onFileSelect}
                processingFiles={processingFiles}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No documents have been uploaded yet.</p>
            <p className="text-sm mt-2">
              Upload documents using the form above to get started.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
} 