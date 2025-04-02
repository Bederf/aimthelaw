import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X, FileText, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FinancialDocumentUploadProps {
  clientId: string;
  onUploadComplete: (fileIds: string[]) => void;
  title?: string;
  description?: string;
  buttonText?: string;
  acceptedFileTypes?: string;
}

export function FinancialDocumentUpload({
  clientId,
  onUploadComplete,
  title = "Upload Financial Documents",
  description = "Upload bank statements or payslips for maintenance calculation",
  buttonText = "Upload",
  acceptedFileTypes = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xlsx,.xls"
}: FinancialDocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    console.log(`Uploading ${files.length} files for client ${clientId}`, files);
    
    try {
      const uploadedFileIds: string[] = [];
      
      // If this is a temporary client ID, save it to session storage for later use
      if (clientId.startsWith('temp-')) {
        console.log(`Saving temporary client ID to session storage: ${clientId}`);
        sessionStorage.setItem('maintenance_temp_client_id', clientId);
      }
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);
        
        // Add metadata to indicate this is a financial document
        formData.append('metadata', JSON.stringify({
          document_type: 'financial',
          purpose: 'maintenance_calculation'
        }));
        
        // Add document_type parameter to use the maintenance-files bucket
        formData.append('document_type', 'maintenance');
        
        console.log(`Uploading file as maintenance document: ${file.name} for client ${clientId}`);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData,
        });
        
        if (!response.ok) {
          // Try to parse error response
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            console.error("Failed to parse error response");
          }
          
          console.error(`Upload failed for ${file.name}:`, {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          
          throw new Error(`Failed to upload ${file.name}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Upload success for ${file.name}:`, data);
        
        if (data && data.file_id) {
          uploadedFileIds.push(data.file_id);
        }
      }
      
      console.log("All files uploaded successfully:", uploadedFileIds);
      onUploadComplete(uploadedFileIds);
      
      // Clear selected files
      setFiles([]);
      setIsUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className="flex flex-col items-center justify-center w-full p-6 mt-4 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/20 hover:bg-secondary/30 border-muted-foreground/25"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <Upload className="w-10 h-10 mb-2 text-muted-foreground" />
          <p className="mb-2 text-sm text-center text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-center text-muted-foreground">
            PDF, CSV, XLSX, DOC, DOCX, JPG, PNG (up to 10MB)
          </p>
          <input
            id="fileInput"
            type="file"
            className="hidden"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Selected files:</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button
            variant="default"
            onClick={uploadFiles}
            disabled={isUploading || files.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <span className="loading loading-spinner loading-xs mr-2"></span>
                Uploading...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Upload {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 