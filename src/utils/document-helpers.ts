/**
 * Document Embeddings Utility Functions
 * 
 * These functions provide a safer way to check document embeddings status
 * using the backend API instead of direct Supabase calls.
 */

import axios from 'axios';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Check if a document has embeddings
 * 
 * @param documentId The document ID (file_id) to check
 * @param clientId Optional client ID to filter by
 * @returns Promise with the embeddings check result
 */
export async function checkDocumentEmbeddings(documentId: string, clientId?: string) {
  try {
    // Get auth token
    const token = await getToken();
    
    // Prepare URL with query parameters
    let url = `${API_URL}/api/document/check-embeddings?document_id=${encodeURIComponent(documentId)}`;
    if (clientId) {
      url += `&client_id=${encodeURIComponent(clientId)}`;
    }
    
    // Make the API request
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Return the response data
    return {
      hasEmbeddings: response.data.has_embeddings,
      count: response.data.count,
      documentId: response.data.document_id,
      columnUsed: response.data.column_used
    };
  } catch (error) {
    console.error('Error checking document embeddings:', error);
    
    // Return a default response indicating no embeddings
    return {
      hasEmbeddings: false,
      count: 0,
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check multiple documents for embeddings in batch
 * 
 * @param documentIds Array of document IDs to check
 * @param clientId Optional client ID to filter by
 * @returns Promise with a map of document IDs to embeddings status
 */
export async function checkMultipleDocumentEmbeddings(documentIds: string[], clientId?: string) {
  try {
    // Create a map to store results
    const resultsMap = new Map<string, { hasEmbeddings: boolean, count: number }>();
    
    // Check each document (could be optimized with a batch endpoint in the future)
    const promises = documentIds.map(docId => checkDocumentEmbeddings(docId, clientId));
    const results = await Promise.all(promises);
    
    // Process results into the map
    results.forEach((result, index) => {
      const docId = documentIds[index];
      resultsMap.set(docId, {
        hasEmbeddings: result.hasEmbeddings,
        count: result.count
      });
    });
    
    return resultsMap;
  } catch (error) {
    console.error('Error checking multiple document embeddings:', error);
    
    // Return an empty map on error
    return new Map<string, { hasEmbeddings: boolean, count: number }>();
  }
} 