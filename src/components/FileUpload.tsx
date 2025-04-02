import { FC, useState, useCallback, useRef, DragEvent } from 'react';
import { Upload, Loader2, X, FileIcon, CheckCircle2, AlertCircle, FileUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid';
import { processDocument, FileToProcess } from '@/services/documentProcessingService';
import { STORAGE_BUCKETS, SERVICE_NAMES } from '@/utils/constants';

// Define these types directly since the import is causing issues
type DocumentCategory = 
  | 'legal_documents'
  | 'financial_records'
  | 'correspondence'
  | 'evidence'
  | 'court_filings'
  | 'personal_documents'
  | 'other';

type DocumentSubcategory = 
  | 'contracts'
  | 'agreements'
  | 'invoices'
  | 'statements'
  | 'letters'
  | 'emails'
  | 'photos'
  | 'videos'
  | 'pleadings'
  | 'motions'
  | 'identification'
  | 'certificates'
  | 'miscellaneous';

interface FileUploadProps {
  onUploadComplete: (fileIds: string[]) => void;
  clientId: string;
  category?: string;
  subcategory?: string;
  documentType?: string;
}

interface FileUploadStatus {
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'processed' | 'complete' | 'error';
  error?: string;
  fileId?: string;
}

export const FileUpload: FC<FileUploadProps> = ({
  onUploadComplete,
  clientId,
  category = 'other',
  subcategory = 'miscellaneous',
  documentType
}) => {
  const [uploading, setUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(category as DocumentCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<DocumentSubcategory>(subcategory as DocumentSubcategory);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to check if a file with the same name already exists
  const checkFileExists = async (fileName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('client_files')
        .select('id')
        .eq('client_id', clientId)
        .eq('file_name', fileName)
        .limit(1);
        
      if (error) {
        console.error('Error checking file existence:', error);
        return false; // Assume it doesn't exist if there's an error
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Exception checking file existence:', error);
      return false; // Assume it doesn't exist if there's an exception
    }
  };

  // Function to get the text-based client ID
  const getTextClientId = async (uuidClientId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id')
        .eq('id', uuidClientId)
        .single();
        
      if (error) {
        console.error('Error fetching text client ID:', error);
        return null;
      }
      
      return data?.client_id || null;
    } catch (error) {
      console.error('Exception fetching text client ID:', error);
      return null;
    }
  };

  // Function to get the text-based lawyer ID
  const getTextLawyerId = async (uuidLawyerId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('lawyers')
        .select('lawyer_id')
        .eq('id', uuidLawyerId)
        .single();
        
      if (error) {
        console.error('Error fetching text lawyer ID:', error);
        return null;
      }
      
      return data?.lawyer_id || null;
    } catch (error) {
      console.error('Exception fetching text lawyer ID:', error);
      return null;
    }
  };

  // Function to upload a single file
  const uploadSingleFile = async (file: File, index: number): Promise<string> => {
    try {
      // Update file status to uploading
      setFileStatuses(prev => {
        const newStatuses = [...prev];
        newStatuses[index] = { ...newStatuses[index], status: 'uploading', progress: 10 };
        return newStatuses;
      });

      // Check if file exists
      const fileExists = await checkFileExists(file.name);
      if (fileExists) {
        throw new Error('A file with this name already exists for this client');
      }

      // Update progress
      setFileStatuses(prev => {
        const newStatuses = [...prev];
        newStatuses[index] = { ...newStatuses[index], progress: 20 };
        return newStatuses;
      });

      // Generate a UUID for the file
      const fileId = uuidv4();
      
      // Get text IDs for path construction
      const textClientId = await getTextClientId(clientId) || clientId;
      const textLawyerId = user?.id ? await getTextLawyerId(user.id) : null;
      
      const fileToProcess: FileToProcess = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        clientId
      };

      // Process the document
      const result = await processDocument(fileToProcess, {
        serviceName: SERVICE_NAMES.DOCUMENT_PROCESSING,
        bucketName: STORAGE_BUCKETS.CLIENT_FILES,
        apiEndpoint: '/api/documents/process',
        onProgress: (progress) => {
          setFileStatuses(prev => {
            const newStatuses = [...prev];
            // Scale progress from 0-100% to 20-90% of our UI progress
            const scaledProgress = 20 + (progress * 0.7); 
            newStatuses[index] = { ...newStatuses[index], progress: scaledProgress };
            return newStatuses;
          });
        },
        additionalMetadata: {
          category: selectedCategory,
          subcategory: selectedSubcategory,
          document_type: documentType,
          lawyer_id: user?.id,
          text_client_id: textClientId,
          text_lawyer_id: textLawyerId
        }
      });

      // Update progress to complete
      setFileStatuses(prev => {
        const newStatuses = [...prev];
        newStatuses[index] = { 
          ...newStatuses[index], 
          progress: 100, 
          status: 'complete',
          fileId: result.fileRecord.id
        };
        return newStatuses;
      });

      return result.fileRecord.id;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Update file status to error
      setFileStatuses(prev => {
        const newStatuses = [...prev];
        newStatuses[index] = { 
          ...newStatuses[index], 
          status: 'error', 
          progress: 0,
          error: error.message || 'Unknown error occurred during upload'
        };
        return newStatuses;
      });
      
      throw error;
    }
  };

  // Handler for file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    const newFileStatuses: FileUploadStatus[] = newFiles.map(file => ({
      file,
      progress: 0,
      status: 'queued'
    }));
    
    setFileStatuses(prev => [...prev, ...newFileStatuses]);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a specific file from the queue
  const handleRemoveFile = (index: number) => {
    if (uploading) return; // Prevent removing files during upload
    
    setFileStatuses(prev => {
      const newStatuses = [...prev];
      newStatuses.splice(index, 1);
      return newStatuses;
    });
  };

  // Clear all files
  const handleClearFiles = () => {
    if (uploading) return;
    setFileStatuses([]);
  };
  
  // Function to handle the upload of all files
  const handleUpload = async () => {
    if (fileStatuses.length === 0 || uploading) return;
    
    const queuededFiles = fileStatuses.filter(status => status.status === 'queued');
    if (queuededFiles.length === 0) return;
    
    setUploading(true);
    let uploadedFileIds: string[] = [];
    let anyErrors = false;
    
    try {
      // Process each queued file
      for (let i = 0; i < fileStatuses.length; i++) {
        if (fileStatuses[i].status !== 'queued') continue;
        
        try {
          const fileId = await uploadSingleFile(fileStatuses[i].file, i);
          uploadedFileIds.push(fileId);
        } catch (error) {
          console.error(`Error uploading file ${fileStatuses[i].file.name}:`, error);
          anyErrors = true;
          // Continue with next file
        }
      }
      
      // Notify parent component of success
      if (uploadedFileIds.length > 0) {
        onUploadComplete(uploadedFileIds);
        
        toast.success(
          `${uploadedFileIds.length} file(s) uploaded successfully${anyErrors ? ', but some files had errors' : ''}`
        );
      } else if (anyErrors) {
        toast.error('None of the files could be uploaded. Please try again.');
      }
    } catch (error) {
      console.error('Error during upload process:', error);
      toast.error('An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };
  
  // Handle drag events
  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  // Handle drop event
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const newFileStatuses: FileUploadStatus[] = newFiles.map(file => ({
        file,
        progress: 0,
        status: 'queued'
      }));
      
      setFileStatuses(prev => [...prev, ...newFileStatuses]);
    }
  }, []);
  
  // Get status text and color for a file
  const getFileStatusInfo = (status: FileUploadStatus['status']) => {
    switch(status) {
      case 'queued':
        return { text: 'Ready to upload', color: 'text-blue-500' };
      case 'uploading':
        return { text: 'Uploading...', color: 'text-yellow-500' };
      case 'processing':
        return { text: 'Processing...', color: 'text-yellow-500' };
      case 'processed':
      case 'complete':
        return { text: 'Completed', color: 'text-green-500' };
      case 'error':
        return { text: 'Failed', color: 'text-red-500' };
      default:
        return { text: 'Unknown', color: 'text-gray-500' };
    }
  };
  
  // Trigger file selection dialog
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground mb-2 block">Document Category</label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}
            disabled={uploading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="legal_documents">Legal Documents</SelectItem>
              <SelectItem value="financial_records">Financial Records</SelectItem>
              <SelectItem value="correspondence">Correspondence</SelectItem>
              <SelectItem value="evidence">Evidence</SelectItem>
              <SelectItem value="court_filings">Court Filings</SelectItem>
              <SelectItem value="personal_documents">Personal Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <label className="text-sm text-muted-foreground mb-2 block">Document Subcategory</label>
          <Select
            value={selectedSubcategory}
            onValueChange={(value) => setSelectedSubcategory(value as DocumentSubcategory)}
            disabled={uploading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contracts">Contracts</SelectItem>
              <SelectItem value="agreements">Agreements</SelectItem>
              <SelectItem value="invoices">Invoices</SelectItem>
              <SelectItem value="statements">Statements</SelectItem>
              <SelectItem value="letters">Letters</SelectItem>
              <SelectItem value="emails">Emails</SelectItem>
              <SelectItem value="photos">Photos</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="pleadings">Pleadings</SelectItem>
              <SelectItem value="motions">Motions</SelectItem>
              <SelectItem value="identification">Identification</SelectItem>
              <SelectItem value="certificates">Certificates</SelectItem>
              <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Drag and drop area */}
      <div 
        className={`
          border-2 border-dashed rounded-lg p-8 text-center 
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} 
          transition-colors duration-200
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 rounded-full bg-primary/10">
            <FileUp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Drag files here or click to upload</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: PDF, DOC, DOCX, MP3, WAV, OGG
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBrowseClick} 
            disabled={uploading}
            className="mt-2"
          >
            Browse files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.mp3,.wav,.ogg"
            disabled={uploading}
          />
        </div>
      </div>
      
      {/* File list */}
      {fileStatuses.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3 bg-muted/50 flex justify-between items-center border-b">
            <div className="font-medium">
              {fileStatuses.length} file{fileStatuses.length !== 1 ? 's' : ''} selected
            </div>
            {!uploading && (
              <Button variant="ghost" size="sm" onClick={handleClearFiles}>
                Clear all
              </Button>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {fileStatuses.map((status, index) => {
              const statusInfo = getFileStatusInfo(status.status);
              
              return (
                <div 
                  key={index} 
                  className={`
                    flex items-center justify-between p-3 hover:bg-muted/50 
                    ${status.status === 'error' ? 'bg-red-50' : ''} 
                    ${status.status === 'complete' ? 'bg-green-50' : ''}
                    border-b last:border-b-0
                  `}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="overflow-hidden">
                      <p className="font-medium truncate" title={status.file.name}>
                        {status.file.name}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>{(status.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span className="mx-2">•</span>
                        <span className={statusInfo.color}>{statusInfo.text}</span>
                      </div>
                      {status.error && (
                        <p className="text-xs text-red-600 mt-1">{status.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Progress indicator or status icon */}
                    {status.status === 'uploading' || status.status === 'processing' ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16">
                          <Progress value={status.progress} className="h-2" />
                        </div>
                        <span className="text-xs">{status.progress}%</span>
                      </div>
                    ) : status.status === 'complete' || status.status === 'processed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : status.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveFile(index)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      
      {/* Upload button */}
      {fileStatuses.some(file => file.status === 'queued') && (
        <Button 
          className="w-full"
          onClick={handleUpload}
          disabled={uploading || fileStatuses.filter(f => f.status === 'queued').length === 0}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {fileStatuses.filter(f => f.status === 'uploading' || f.status === 'processing').length} of {fileStatuses.filter(f => f.status !== 'complete' && f.status !== 'error').length} files...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {fileStatuses.filter(f => f.status === 'queued').length} file{fileStatuses.filter(f => f.status === 'queued').length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
};
