import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface FileUploaderProps {
  clientId: string;
  onUploadComplete?: () => void;
}

export function FileUploader({ clientId, onUploadComplete }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    
    try {
      // Track how many files have been processed
      let uploadedCount = 0;
      let errorCount = 0;
      const totalFiles = files.length;
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Create a unique file name with client ID prefix for better organization
          const fileExt = file.name.split('.').pop();
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileName = `${clientId}/${timestamp}-${randomId}.${fileExt}`;
          const filePath = `client-files/${fileName}`;
          
          console.log(`[FileUploader] Uploading file: ${file.name} (${file.size} bytes) to ${filePath}`);
          
          // 1. Upload to Supabase storage bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('client-documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('[FileUploader] Upload error:', uploadError);
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }
          
          // 2. Get the URL of the uploaded file
          const { data: urlData } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
          
          if (!urlData) {
            throw new Error('Could not get public URL for file');
          }
          
          const fileUrl = urlData.publicUrl;
          
          // Generate unique ID for the file record
          const fileId = `file_${timestamp}_${randomId}`;
          
          // 3. Create file metadata for storage
          const fileMetadata = {
            file_name: file.name,
            file_path: filePath,
            file_url: fileUrl,
            file_type: file.type,
            file_size: file.size,
            upload_date: new Date().toISOString(),
            client_id: clientId
          };
          
          // 4. Create record in client_files table
          const { data: fileData, error: dbError } = await supabase
            .from('client_files')
            .insert({
              id: fileId,
              client_id: clientId,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              status: 'uploaded',
              metadata: fileMetadata,
              created_at: new Date().toISOString(),
              url: fileUrl
            })
            .select()
            .single();
          
          if (dbError) {
            console.error('[FileUploader] Database insert error:', dbError);
            throw new Error(`Database record creation failed: ${dbError.message}`);
          }
          
          console.log(`[FileUploader] Successfully created record in client_files: ${fileId}`);
          
          // 5. Create an entry in document_embeddings if appropriate (for text documents)
          if (file.type.includes('pdf') || file.type.includes('text') || file.type.includes('document')) {
            try {
              const { data: embeddingData, error: embeddingError } = await supabase
                .from('document_embeddings')
                .insert({
                  file_id: fileId,
                  client_id: clientId,
                  metadata: {
                    ...fileMetadata,
                    content_extraction_status: 'pending'
                  }
                })
                .select()
                .single();
                
              if (embeddingError) {
                console.warn('[FileUploader] Could not create embedding record:', embeddingError);
              } else {
                console.log(`[FileUploader] Created embedding record for file: ${fileId}`);
              }
            } catch (embeddingErr) {
              console.warn('[FileUploader] Error creating embedding:', embeddingErr);
              // Non-critical error, continue processing
            }
          }
          
          // Update progress
          uploadedCount++;
          setProgress(Math.floor((uploadedCount / totalFiles) * 100));
          
        } catch (fileError) {
          console.error(`[FileUploader] Error processing file ${file.name}:`, fileError);
          errorCount++;
          // Continue with next file
        }
      }
      
      // Show appropriate success/error message
      if (uploadedCount > 0) {
        const message = errorCount > 0 
          ? `Uploaded ${uploadedCount} file(s). ${errorCount} file(s) failed.` 
          : `Successfully uploaded ${uploadedCount} file(s)`;
          
        toast({
          title: 'Upload Complete',
          description: message,
          variant: errorCount > 0 ? 'default' : 'default'
        });
        
        // Call the callback if provided
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else if (errorCount > 0) {
        toast({
          title: 'Upload Failed',
          description: `Failed to upload any files. Please try again.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[FileUploader] Unexpected error:', error);
      toast({
        title: 'Upload Error',
        description: 'An unexpected error occurred during upload',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        multiple 
        accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png"
      />
      
      <Button
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center"
        onClick={handleFileSelect}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Uploading... {progress}%</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            <span>Upload Documents</span>
          </>
        )}
      </Button>
    </div>
  );
} 