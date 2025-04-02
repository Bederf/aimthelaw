import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface DocumentDeleteResponse {
  status: string;
  message: string;
  document_id: string;
}

export interface SupabaseDocument {
  file_name: string;
  status: string;
  metadata: Record<string, any>;
}

export class DocumentService {
  private clientId: string;
  private apiUrl: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Get access token for authenticated requests
   */
  private async getAccessToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error('Not authenticated');
    }
    return data.session.access_token;
  }

  /**
   * Delete a document and all its associated data (chunks, embeddings, etc.)
   * This uses the backend API to ensure proper cascading deletion
   */
  async deleteDocument(documentId: string): Promise<DocumentDeleteResponse> {
    try {
      const token = await this.getAccessToken();
      
      // Call the backend API to delete the document
      const response = await fetch(`${this.apiUrl}/api/documents/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: this.clientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete document');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Delete a document directly from storage and database
   * This is a fallback method and should be used with caution
   * as it may not properly clean up all related data
   */
  async deleteDocumentDirect(file: { id: string, file_path: string }): Promise<void> {
    try {
      // 1. Delete from storage bucket
      const { error: storageError } = await supabase.storage
        .from('client-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // 2. Delete from database (this will trigger CASCADE DELETE for related records)
      const { error: dbError } = await supabase
        .from('client_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error directly deleting document:', error);
      throw error;
    }
  }

  /**
   * Comprehensive document deletion that tries the API first,
   * then falls back to direct deletion if needed
   */
  async safeDeleteDocument(file: { id: string, file_path: string }): Promise<boolean> {
    try {
      // First try the API method (preferred)
      await this.deleteDocument(file.id);
      return true;
    } catch (apiError) {
      console.warn('API deletion failed, falling back to direct deletion:', apiError);
      
      try {
        // Fall back to direct deletion
        await this.deleteDocumentDirect(file);
        return true;
      } catch (directError) {
        console.error('Both deletion methods failed:', directError);
        throw directError;
      }
    }
  }
}

// Export a factory function to create the service
export const createDocumentService = (clientId: string) => new DocumentService(clientId);

export const getDocument = async (documentId: string): Promise<SupabaseDocument | null> => {
  try {
    // First check if documentId is valid
    if (!documentId) {
      console.warn('No document ID provided');
      return null;
    }

    const { data, error } = await supabase
      .from('client_files')
      .select('file_name,status,metadata')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Document not found - handle gracefully
        console.warn(`Document ${documentId} not found`);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    // Log error but don't throw - return null for missing documents
    console.error('Error in getDocument:', error);
    return null;
  }
}; 