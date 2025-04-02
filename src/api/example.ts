/**
 * Example of using the API client with generated types
 * 
 * This file shows how to use the API client with the types generated from
 * the FastAPI schema. This is just an example and not meant to be imported.
 */

// Import the API client
import apiClient from './apiClient';

// Import the generated types
import { 
  AIQueryRequest, 
  AIResponse, 
  DocumentProcessRequest, 
  DocumentProcessResponse,
  DateExtractionRequest,
  DateExtractionResponse
} from '../types/api-types';

/**
 * Example: Query the AI with a document
 */
async function exampleQueryAI() {
  // Use the generated type for the request
  const request: AIQueryRequest = {
    query: "Analyze this contract for potential risks",
    client_id: "client-123",
    documents: ["doc-456"],
    use_rag: true
  };
  
  try {
    // Use the generated type for the response
    const response: AIResponse = await apiClient.queryAI(request);
    
    console.log('AI Response:', response.response);
    console.log('Citations:', response.citations);
    
    if (response.token_usage) {
      console.log(`Used ${response.token_usage.total_tokens} tokens`);
    }
    
    return response;
  } catch (error) {
    console.error('Error querying AI:', error);
    throw error;
  }
}

/**
 * Example: Process a document
 */
async function exampleProcessDocument() {
  // Use the generated type for the request
  const request: DocumentProcessRequest = {
    document_id: "doc-123",
    client_id: "client-456",
    filename: "contract.pdf",
    content_type: "application/pdf",
    process_for_rag: true
  };
  
  try {
    // Use the generated type for the response
    const response: DocumentProcessResponse = await apiClient.processDocument(request);
    
    console.log('Document Status:', response.status);
    console.log('Job ID:', response.job_id);
    
    return response;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Example: Extract dates from documents
 */
async function exampleExtractDates() {
  // Use the generated type for the request
  const request: DateExtractionRequest = {
    client_id: "client-123",
    documents: ["doc-456", "doc-789"],
    date_format: "YYYY-MM-DD"
  };
  
  try {
    // Use the generated type for the response
    const response: DateExtractionResponse = await apiClient.extractDates(request);
    
    console.log('Extracted Dates:', response.dates);
    console.log('Document Map:', response.document_map);
    
    return response;
  } catch (error) {
    console.error('Error extracting dates:', error);
    throw error;
  }
}

// This file is just for examples, so these functions aren't actually called
export { 
  exampleQueryAI, 
  exampleProcessDocument, 
  exampleExtractDates 
}; 