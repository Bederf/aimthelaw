import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/types/ai';
import { toast } from '@/components/ui/use-toast';

interface LoadClientFilesParams {
  clientId: string;
  callback: (files: Document[]) => void;
}

interface LoadTrainingFilesParams {
  callback: (files: Document[]) => void;
}

export const AILawyerActions = {
  /**
   * Loads client files from Supabase
   */
  loadClientFiles: async ({ clientId, callback }: LoadClientFilesParams) => {
    try {
      if (!clientId) {
        console.warn('No client ID provided to loadClientFiles');
        callback([]);
        return;
      }

      console.log('Loading files for client:', clientId);
      
      const { data: filesData, error: filesError } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (filesError) {
        console.error('Error loading client files:', filesError);
        // Use toast.error directly instead of the hook
        toast({
          title: "Error",
          description: "Could not load client documents",
          variant: "destructive"
        });
        callback([]);
        return;
      }
      
      if (filesData) {
        // Double-check that all files belong to this client
        const validFiles = filesData.filter(file => file.client_id === clientId);
        
        if (filesData.length !== validFiles.length) {
          console.warn(`Found ${filesData.length} files but only ${validFiles.length} match client_id ${clientId}`);
        }
        
        callback(validFiles);
      } else {
        callback([]);
      }
    } catch (error) {
      console.error('Unexpected error in loadClientFiles:', error);
      toast({
        title: "Error",
        description: "Failed to load client files",
        variant: "destructive"
      });
      callback([]);
    }
  },

  /**
   * Loads training files from Supabase
   * These are global files available for all users
   */
  loadTrainingFiles: async ({ callback }: LoadTrainingFilesParams) => {
    try {
      console.log('Loading training files');
      
      // Get legal knowledge with their associated files
      const { data: knowledgeData, error: knowledgeError } = await supabase
        .from('legal_knowledge')
        .select(`
          *,
          legal_files!legal_knowledge_file_id_fkey (*)
        `)
        .order('created_at', { ascending: false });
      
      if (knowledgeError) {
        console.error('Error loading training knowledge:', knowledgeError);
        toast({
          title: "Error",
          description: "Could not load training documents",
          variant: "destructive"
        });
        callback([]);
        return;
      }
      
      if (knowledgeData) {
        // Filter to only include entries with associated files
        const validEntries = knowledgeData.filter(entry => entry.legal_files);
        
        // Map the legal knowledge to Document type
        const trainingFiles: Document[] = validEntries
          .filter(entry => {
            // Filter out files from other modules
            const metadata = entry.metadata || {};
            const fileMetadata = entry.legal_files?.metadata || {};
            
            // Skip files from maintenance or receipt scanner modules
            if (
              metadata.module === 'maintenance' || 
              fileMetadata.module === 'maintenance' ||
              metadata.module === 'receipt_scanner' || 
              fileMetadata.module === 'receipt_scanner'
            ) {
              console.log(`Skipping file from module: ${metadata.module || fileMetadata.module}`);
              return false;
            }
            
            // Only include files flagged for AI lawyer or with no module specified
            return !metadata.module || 
                   !fileMetadata.module || 
                   metadata.module === 'ai_lawyer' || 
                   fileMetadata.module === 'ai_lawyer';
          })
          .map(entry => ({
            id: entry.id,
            title: entry.legal_files.title || 'Training Document',
            filename: entry.legal_files.file_name || 'training.txt',
            filePath: entry.legal_files.file_path || '',
            fileType: entry.legal_files.document_type || 'text',
            fileSize: entry.legal_files.file_size || 0,
            content: entry.content || '',
            metadata: {
              ...entry.legal_files?.metadata,
              ...entry.metadata,
              level: entry.level,
              isTrainingDocument: true,
              module: 'ai_lawyer' // Always mark as ai_lawyer module
            },
            type: 'training' // Explicitly mark as training document type
          }));
        
        console.log(`Loaded ${trainingFiles.length} training files from knowledge base (filtered by module)`);
        callback(trainingFiles);
      } else {
        callback([]);
      }
    } catch (error) {
      console.error('Unexpected error in loadTrainingFiles:', error);
      toast({
        title: "Error",
        description: "Failed to load training files",
        variant: "destructive"
      });
      callback([]);
    }
  }
}; 