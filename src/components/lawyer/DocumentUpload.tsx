import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X, FileText, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DocumentUploadProps {
  clientId: string;
  onUploadComplete: (fileIds: string[]) => void;
  title?: string;
  description?: string;
  buttonText?: string;
  acceptedFileTypes?: string;
}

export function DocumentUpload({
  clientId,
  onUploadComplete,
  title = "Upload Financial Documents",
  description = "Upload bank statements or payslips for maintenance calculation",
  buttonText = "Upload",
  acceptedFileTypes = ".pdf,.jpg,.jpeg,.png,.doc,.docx"
}: DocumentUploadProps) {
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
    const uploadedFileIds: string[] = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploadedFileIds.push(data.file_id);
      }

      toast({
        title: "Upload successful",
        description: `${uploadedFileIds.length} document(s) uploaded successfully`,
        variant: "default"
      });

      // Reset state
      setFiles([]);
      setIsOpen(false);

      // Notify parent component
      onUploadComplete(uploadedFileIds);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
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
            PDF, DOC, DOCX, JPG, PNG (up to 10MB)
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