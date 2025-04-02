import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/config/api';
import { loggingService } from './loggingService';

export interface AIProcessingOptions {
  useRAG?: boolean;
  documents?: string[];
  systemPrompt?: string;
  clientId?: string;
}

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    chunkIndex: number;
  };
}

interface AIQueryResponse {
  response: string;
  sources?: Array<{
    content: string;
    metadata: {
      chunk_index: number;
      total_chunks: number;
      chunk_size: number;
    };
    similarity_score: number;
  }>;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
}

export class LocalAIService {
  private clientId: string;

  constructor(clientId: string) {
    if (!clientId) {
      throw new Error('Client ID is required');
    }
    this.clientId = clientId;
  }

  async processQuery(
    query: string,
    selectedDocuments: string[] = []
  ): Promise<Message> {
    try {
      await loggingService.info('LocalAI', 'process_query', 'Starting query processing', {
        query_length: query.length,
        document_count: selectedDocuments.length
      }, this.clientId);

      console.log("Sending query to FastAPI with FAISS retrieval...");
      
      // Make the API call
      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          client_id: this.clientId,
          documents: selectedDocuments,
          use_rag: selectedDocuments.length > 0
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        await loggingService.error('LocalAI', 'process_query', 'Failed to process AI query', error, null, this.clientId);
        throw new Error("Failed to process AI query");
      }

      const aiResponse: AIQueryResponse = await response.json();

      // Log token usage
      await loggingService.logTokenUsage(this.clientId, 'process_query', aiResponse.token_usage, aiResponse.cost);

      // Format the response with proper markdown and structure
      let formattedContent = aiResponse.response;

      // If the response contains a list, ensure proper formatting
      formattedContent = formattedContent.replace(/(\d+)\.\s+/g, '\n$1. ');
      
      // Add spacing between paragraphs
      formattedContent = formattedContent.replace(/\n/g, '\n\n');
      
      // Format headings
      formattedContent = formattedContent.replace(/(\*\*[^*]+\*\*)/g, '\n\n$1\n');

      // Add sources if available
      if (aiResponse.sources && aiResponse.sources.length > 0) {
        formattedContent += "\n\n---\n\n**Relevant Sources:**\n";
        formattedContent += aiResponse.sources
          .map((source, index) => {
            const score = (source.similarity_score * 100).toFixed(1);
            return `${index + 1}. Match (${score}%): "${source.content.substring(0, 150)}..."`;
          })
          .join("\n");
      }

      // Clean up any excessive newlines
      formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');

      await loggingService.info('LocalAI', 'process_query_complete', 'Query processing completed', {
        token_usage: aiResponse.token_usage,
        cost: aiResponse.cost,
        has_sources: !!aiResponse.sources?.length
      }, this.clientId);

      return {
        role: "assistant",
        content: formattedContent,
        timestamp: new Date(),
        metadata: {
          token_usage: aiResponse.token_usage,
          cost: aiResponse.cost,
          sources: aiResponse.sources
        }
      };
    } catch (error) {
      await loggingService.error('LocalAI', 'process_query', 'Error processing AI query', error, null, this.clientId);
      throw error;
    }
  }

  async analyzeDocument(documentId: string): Promise<Message> {
    try {
      await loggingService.info('LocalAI', 'analyze_document', 'Starting document analysis', {
        document_id: documentId
      }, this.clientId);
      
      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "Perform a comprehensive legal analysis of the document",
          client_id: this.clientId,
          document_id: documentId,
          use_rag: true
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        await loggingService.error('LocalAI', 'analyze_document', 'Failed to analyze document', error, null, this.clientId);
        throw new Error("Failed to analyze document");
      }

      const aiResponse: AIQueryResponse = await response.json();

      // Log token usage
      await loggingService.logTokenUsage(this.clientId, 'analyze_document', aiResponse.token_usage, aiResponse.cost);

      await loggingService.info('LocalAI', 'analyze_document_complete', 'Document analysis completed', {
        token_usage: aiResponse.token_usage,
        cost: aiResponse.cost
      }, this.clientId);

      return {
        role: "assistant",
        content: aiResponse.response,
        timestamp: new Date(),
        metadata: {
          token_usage: aiResponse.token_usage,
          cost: aiResponse.cost
        }
      };
    } catch (error) {
      await loggingService.error('LocalAI', 'analyze_document', 'Error analyzing document', error, null, this.clientId);
      throw error;
    }
  }

  async addDocument(id: string, content: string, preserveEmbeddings: boolean = true): Promise<void> {
    try {
      // Log start of processing
      loggingService.info('LocalAI', 'add_document', 'Starting document processing', {
        file_id: id,
        preserve_embeddings: preserveEmbeddings
      }, this.clientId).catch(console.error);
      
      // Extract just the filename if it's a path
      const fileId = id.includes('/') ? id.split('/').pop() : id;
      
      if (!fileId) {
        const error = new Error('Invalid document ID');
        loggingService.error('LocalAI', 'add_document', error.message, error, null, this.clientId).catch(console.error);
        throw error;
      }
      
      if (!content || content.trim().length === 0) {
        const error = new Error('Document content is empty');
        loggingService.error('LocalAI', 'add_document', error.message, error, null, this.clientId).catch(console.error);
        throw error;
      }
      
      // Log content size
      loggingService.info('LocalAI', 'add_document', 'Processing document content', {
        file_id: fileId,
        content_size: content.length,
        preserve_embeddings: preserveEmbeddings
      }, this.clientId).catch(console.error);
      
      // Get the file type from the file extension
      const fileType = fileId.split('.').pop()?.toLowerCase() || '';

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Notify FastAPI backend of new document
      const response = await fetch(`${API_BASE_URL}/api/documents/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          file_id: fileId,
          client_id: this.clientId,
          content: content,
          file_type: fileType,
          use_local_cache: true,
          is_base64: true,
          preserve_embeddings: preserveEmbeddings
        }),
      });

      // Check for HTTP errors
      if (!response.ok) {
        let errorDetail = 'Failed to process document';
        let errorData = null;
        
        try {
          // Try to get detailed error message from response
          errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (parseError) {
          // If we can't parse the JSON, use the status text
          errorDetail = `${response.status}: ${response.statusText}`;
        }
        
        const error = new Error(errorDetail);
        loggingService.error('LocalAI', 'add_document', error.message, error, errorData, this.clientId).catch(console.error);
        throw error;
      }

      // Parse the successful response
      const result = await response.json();
      
      // Log success
      loggingService.info('LocalAI', 'add_document_complete', 'Document processing completed', {
        file_id: fileId,
        status: result.status
      }, this.clientId).catch(console.error);

    } catch (error) {
      // Ensure error is properly formatted before logging
      const formattedError = error instanceof Error ? error : new Error(String(error));
      
      loggingService.error(
        'LocalAI',
        'add_document',
        'Error processing document',
        formattedError,
        { originalError: error },
        this.clientId
      ).catch(console.error);
      
      // Create a more user-friendly error message
      let errorMessage = 'Failed to process document';
      
      if (formattedError.message) {
        errorMessage = formattedError.message;
        
        // Check for specific error types and provide more helpful messages
        if (errorMessage.includes('token_usage')) {
          errorMessage = 'Document processed but token usage tracking failed. The document should still be available for analysis.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Server error while processing document. Please try again or contact support if the issue persists.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorMessage = 'Document processing timed out. The document may be too large or the server is busy.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  async removeDocument(fileInfo: { fileId: string, filePath: string }): Promise<void> {
    try {
      await loggingService.info('LocalAI', 'remove_document', 'Starting document removal', {
        file_id: fileInfo.fileId,
        file_path: fileInfo.filePath
      }, this.clientId);
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(fileInfo.fileId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        await loggingService.error('LocalAI', 'remove_document', 'Failed to delete document', error, null, this.clientId);
        throw new Error(error.detail || 'Failed to delete document');
      }

      await loggingService.info('LocalAI', 'remove_document_complete', 'Document removal completed', {
        file_id: fileInfo.fileId
      }, this.clientId);

    } catch (error) {
      await loggingService.error('LocalAI', 'remove_document', 'Error removing document', error, null, this.clientId);
      throw error;
    }
  }

  async getDocumentIds(): Promise<string[]> {
    try {
      await loggingService.info('LocalAI', 'get_document_ids', 'Fetching document IDs', null, this.clientId);

      const { data: files, error } = await supabase
        .from("client_files")
        .select("id")
        .eq("client_id", this.clientId);

      if (error) {
        await loggingService.error('LocalAI', 'get_document_ids', 'Failed to fetch document IDs', error, null, this.clientId);
        throw error;
      }

      await loggingService.info('LocalAI', 'get_document_ids_complete', 'Document IDs fetched', {
        count: files?.length || 0
      }, this.clientId);
      
      return files?.map(f => f.id) || [];
    } catch (error) {
      await loggingService.error('LocalAI', 'get_document_ids', 'Error fetching document IDs', error, null, this.clientId);
      throw error;
    }
  }
}
