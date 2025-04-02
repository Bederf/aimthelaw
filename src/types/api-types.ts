/**
 * DUMMY TypeScript interfaces for API
 * This file was generated as a placeholder when the server could not be started.
 * Run the type generation script when the server is available to get the real types.
 * DO NOT EDIT MANUALLY
 */

// Example types - replace with actual generated types
export interface AIQueryRequest {
  query: string;
  client_id: string;
  documents?: string[];
  use_rag?: boolean;
  max_tokens?: number;
  system_prompt?: string;
  model?: string;
  conversation_id?: string;
  previous_messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  response: string;
  citations?: string[];
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DocumentProcessRequest {
  file_id: string;
  client_id: string;
  options: {
    extract_text?: boolean;
    generate_embeddings?: boolean;
    ocr_enabled?: boolean;
    language?: string;
    chunk_size?: number;
    chunk_overlap?: number;
  };
  metadata?: {
    source?: string;
    author?: string;
    created_at?: string;
    description?: string;
    title?: string;
    [key: string]: any;
  };
}

export interface DocumentProcessResponse {
  success: boolean;
  file_id?: string;
  client_id?: string;
  chunks_count?: number;
  status?: string;
  error?: string;
  message?: string;
}

export interface DateExtractionRequest {
  client_id: string;
  content: string;
  model?: string;
  file_id?: string;
  use_rag?: boolean;
  skip_training_data?: boolean;
}

export interface DateEvent {
  date: string;
  event: string;
  context?: string;
  confidence: number;
  source_document?: string;
}

export interface StructuredTimeline {
  [year: string]: {
    [month: string]: DateEvent[];
  } | DateEvent[];  // For unknown_dates
}

export interface DateExtractionResponse {
  message: string;
  dates: DateEvent[];
  structured_timeline: StructuredTimeline;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  sources?: any[];
}

export interface LegalSummaryResponse {
  summary: string;
  sections?: Record<string, string>;
  structured_summary?: Record<string, any>;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  sources: string[];
}

export interface CourtPreparationResponse {
  strategy?: string;
  response?: string;
  message?: string;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  sources: string[];
}

export interface LetterAnalysisResponse {
  response?: string;
  analysis?: string;
  key_points?: string[];
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
}

export interface ClientFile {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'partial';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  size_bytes?: number;
}

// Type aliases for endpoints
export type queryAIRequest = AIQueryRequest;
export type queryAIResponse = AIResponse;
export type processDocumentRequest = DocumentProcessRequest;
export type processDocumentResponse = DocumentProcessResponse;
export type extractDatesRequest = DateExtractionRequest;
export type extractDatesResponse = DateExtractionResponse;
