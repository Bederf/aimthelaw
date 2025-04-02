import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { fromBucket } from '@/utils/supabase-utils';
import { api } from '@/api/apiClient';
import { withErrorHandling } from '@/utils/errorHandler';
import { trackTokenUsage } from '@/utils/tokenTrackingHelper';
import { SERVICE_NAMES, TOKEN_ESTIMATION } from '@/utils/constants';

interface ReceiptUploaderProps {
  clientId: string;
  onUploadComplete: (fileUrl: string, extractedData: any) => void;
}

export function ReceiptUploader({ clientId, onUploadComplete }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Only accept images
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG)');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const uploadReceipt = async () => {
    if (!file || !clientId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    // Use our error handling wrapper to standardize error handling
    const result = await withErrorHandling(async () => {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      
      // Upload to Supabase storage using type-safe bucket access
      const maintenanceReceiptsBucket = fromBucket('maintenance-receipts');
      
      const { data, error } = await maintenanceReceiptsBucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      if (error) throw error;
      
      setUploadProgress(100);
      
      // Get the public URL
      const { data: { publicUrl } } = maintenanceReceiptsBucket
        .getPublicUrl(filePath);
      
      // Process receipt with OCR
      setIsProcessing(true);
      
      // Send the image URL to the backend for OCR processing
      const response = await api.post('/api/maintenance/receipts/process', {
        client_id: clientId,
        receipt_url: publicUrl
      });
      
      if (!response.data.success) {
        throw new Error(response.data.detail || 'Failed to process receipt');
      }
      
      const extractedData = response.data.data;
      
      // Use our centralized token tracking utility
      await trackTokenUsage({
        clientId: clientId,
        service: SERVICE_NAMES.RECEIPT_OCR,
        responseData: response.data,
        model: response.data.token_usage?.model || 'gpt-4-vision',
        fallbackEstimation: {
          contentSize: file.size,
          charsPerToken: TOKEN_ESTIMATION.IMAGE_BYTES_PER_TOKEN,
          completionRatio: TOKEN_ESTIMATION.COMPLETION_RATIO.RECEIPT_OCR
        },
        metadata: {
          receipt_name: file.name,
          receipt_size: file.size,
          items_extracted: extractedData.items?.length || 0,
          store_name: extractedData.store_name || 'unknown'
        }
      });
      
      return { publicUrl, extractedData };
    }, {
      errorTitle: "Receipt Processing Failed",
      errorMessage: "There was an error processing your receipt.",
      successTitle: "Receipt Processed Successfully",
      successMessage: (result) => `Extracted ${result.extractedData.items.length} items from ${result.extractedData.store_name}`,
      onSuccess: (result) => {
        // Call the callback with the results
        onUploadComplete(result.publicUrl, result.extractedData);
        
        // Reset state
        setIsProcessing(false);
        setFile(null);
      },
      onError: (error) => {
        console.error('Processing error:', error);
        setError(error instanceof Error ? error.message : 'Failed to process receipt');
        setIsUploading(false);
        setIsProcessing(false);
      }
    });
    
    if (!result) {
      // If result is null, there was an error already handled by withErrorHandling
      setIsUploading(false);
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-lg p-6 h-48">
            {!file ? (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">Drag & drop a receipt image here or click to browse</p>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="receipt-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Select Image
                  </Button>
                </label>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative rounded-md overflow-hidden w-40 h-40 mb-4">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Receipt preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">{file.name}</p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-primary text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing receipt with OCR...</span>
            </div>
          )}
          
          <div className="flex justify-end">
            {file && !isUploading && !isProcessing ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setFile(null)}
                  disabled={isUploading || isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={uploadReceipt}
                  disabled={isUploading || isProcessing}
                >
                  Upload & Process
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 