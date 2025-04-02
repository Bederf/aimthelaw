import { trackTokenUsage } from '@/utils/tokenTrackingHelper';
import { withErrorHandling } from '@/utils/errorHandler';
import { authenticatedFetch } from '@/utils/apiHelpers';
import { API_BASE_URL, SERVICE_NAMES, FILE_STATUS, DEFAULT_MODEL } from '@/utils/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FileToProcess {
  id?: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  clientId: string;
}

export interface FileProcessingOptions {
  serviceName?: string;
  bucketName: string;
  model?: string;
  showSuccessToast?: boolean;
  apiEndpoint?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  additionalMetadata?: Record<string, any>;
}

/**
 * Process a document by uploading it to storage and tracking token usage
 * @param fileToProcess The file object to process
 * @param options Processing options including bucket, service name, etc.
 * @returns Promise with processing result
 */
export const processDocument = async (
  fileToProcess: FileToProcess,
  options: FileProcessingOptions
) => {
  const {
    serviceName = SERVICE_NAMES.DOCUMENT_PROCESSING,
    bucketName,
    model = DEFAULT_MODEL,
    showSuccessToast = true,
    apiEndpoint,
    onProgress,
    onSuccess,
    onError,
    additionalMetadata = {}
  } = options;

  return withErrorHandling(
    async () => {
      // Create database record for the file
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          name: fileToProcess.name,
          size: fileToProcess.size,
          type: fileToProcess.type,
          client_id: fileToProcess.clientId,
          status: FILE_STATUS.UPLOADING,
          ...additionalMetadata
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to create file record: ${dbError.message}`);
      }

      // Upload to storage
      const filePath = `${fileToProcess.clientId}/${fileRecord.id}/${fileToProcess.name}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToProcess.file, {
          onUploadProgress: (progress) => {
            if (onProgress) {
              onProgress(progress.percent || 0);
            }
          },
        });

      if (uploadError) {
        // Update file status to error
        await supabase
          .from('files')
          .update({ status: FILE_STATUS.ERROR, error_message: uploadError.message })
          .eq('id', fileRecord.id);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Update file record with storage path and change status to processing
      await supabase
        .from('files')
        .update({
          storage_path: uploadData?.path,
          status: FILE_STATUS.PROCESSING,
        })
        .eq('id', fileRecord.id);

      // If an API endpoint is provided, process the file
      let processingResult;
      if (apiEndpoint) {
        processingResult = await authenticatedFetch(`${API_BASE_URL}${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileRecord.id,
            client_id: fileToProcess.clientId,
            file_path: uploadData?.path,
            model,
          }),
        });

        // Track token usage
        await trackTokenUsage({
          clientId: fileToProcess.clientId,
          service: serviceName,
          responseData: processingResult,
          model,
          fallbackEstimation: fileToProcess.size,
          metadata: {
            fileId: fileRecord.id,
            fileName: fileToProcess.name,
            ...additionalMetadata
          }
        });

        // Update file status to complete
        await supabase
          .from('files')
          .update({
            status: FILE_STATUS.COMPLETE,
            processed_at: new Date().toISOString(),
          })
          .eq('id', fileRecord.id);
      }

      return {
        fileRecord,
        uploadData,
        processingResult
      };
    },
    {
      errorTitle: 'Document Processing Failed',
      errorMessage: `Failed to process ${fileToProcess.name}. Please try again.`,
      successTitle: showSuccessToast ? 'Document Processed' : undefined,
      successMessage: showSuccessToast ? `${fileToProcess.name} was successfully processed.` : undefined,
      onSuccess,
      onError
    }
  );
};

/**
 * Process multiple documents in sequence
 * @param filesToProcess Array of files to process
 * @param options Processing options
 * @returns Promise with array of processing results
 */
export const processMultipleDocuments = async (
  filesToProcess: FileToProcess[],
  options: FileProcessingOptions
) => {
  const results = [];
  let failedCount = 0;
  
  for (const file of filesToProcess) {
    try {
      const result = await processDocument(file, {
        ...options,
        showSuccessToast: false, // Don't show individual success toasts
      });
      results.push(result);
    } catch (error) {
      failedCount++;
      results.push({ error });
    }
  }

  // Show a summary toast at the end
  if (options.showSuccessToast !== false) {
    const successCount = filesToProcess.length - failedCount;
    if (successCount > 0) {
      toast.success(`Processed ${successCount} document(s) successfully${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
    } else if (failedCount > 0) {
      toast.error(`Failed to process ${failedCount} document(s)`);
    }
  }

  return results;
}; 