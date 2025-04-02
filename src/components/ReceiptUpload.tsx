import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { api } from '@/api/apiClient';
import { processDocument, FileToProcess } from '@/services/documentProcessingService';
import { STORAGE_BUCKETS, SERVICE_NAMES } from '@/utils/constants';

interface ReceiptUploadProps {
  clientId: string;
  onUploadComplete: (fileData: any) => void;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ clientId, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/heic', 'application/pdf'].includes(selectedFile.type)) {
        setError('Please select a valid image or PDF file (JPEG, PNG, HEIC, PDF)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File is too large. Please select a file smaller than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/heic', 'application/pdf'].includes(droppedFile.type)) {
        setError('Please select a valid image or PDF file (JPEG, PNG, HEIC, PDF)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('File is too large. Please select a file smaller than 10MB');
        return;
      }
      
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processReceipt = async () => {
    if (!file || !clientId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Prepare file object for processing
      const fileToProcess: FileToProcess = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        clientId
      };

      // Process the document using our centralized service
      const result = await processDocument(fileToProcess, {
        serviceName: SERVICE_NAMES.RECEIPT_OCR,
        bucketName: STORAGE_BUCKETS.MAINTENANCE_RECEIPTS,
        apiEndpoint: '/api/receipts/process',
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        showSuccessToast: false,
        onSuccess: async (data) => {
          setIsProcessing(false);
          
          // Call the callback with the results
          if (data.processingResult) {
            onUploadComplete({
              url: data.uploadData?.path,
              receipt: data.processingResult
            });
            
            toast.success(
              `Successfully processed receipt${
                data.processingResult.store_name 
                  ? ` from ${data.processingResult.store_name}` 
                  : ''
              }`
            );
          }
        },
        onError: (error) => {
          setError(error.message);
        }
      });
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      setError(error instanceof Error ? error.message : 'Failed to process receipt');
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setFile(null); // Reset file selection
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div 
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 h-48 transition-colors ${
            error 
              ? 'border-destructive/30 bg-destructive/10' 
              : 'border-primary/30 bg-accent/50 hover:bg-accent/70'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!file ? (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Drag & drop a receipt image here or click to browse
              </p>
              <input
                id="receipt-upload"
                type="file"
                accept="image/jpeg,image/png,image/heic,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="receipt-upload">
                <Button variant="outline" className="cursor-pointer" size="sm">
                  Select Receipt
                </Button>
              </label>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative rounded-md overflow-hidden w-36 h-36 mb-4">
                {file.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Receipt preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{file.name}</p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {isUploading && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span>{isProcessing ? 'Processing...' : 'Uploading...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          {file && !isUploading ? (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={processReceipt}
              >
                Process Receipt
              </Button>
            </div>
          ) : (
            isUploading && (
              <Button size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isProcessing ? 'Processing...' : 'Uploading...'}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Simple File Icon component
const FileIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
};

export default ReceiptUpload; 