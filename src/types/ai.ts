// No need to import MessageRole and MessageSender since we define them here
import { Message as ChatMessage } from './chat';

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system"
}

export enum MessageSender {
  USER = "user",
  AI = "ai",
  SYSTEM = "system"
}

export interface Message {
  id: string;
  role: MessageRole;
  sender: MessageSender;
  content: string | any;
  timestamp: Date;
  metadata?: Record<string, any>;
  isPlaceholder?: boolean;
  isSystemMessage?: boolean;
  isLoading?: boolean;
  conversation_id?: string;
  error?: boolean;
  tts_content?: string | null | Record<string, any>;
  attachments?: Array<{
    id?: string;
    filename?: string;
    file_name?: string;
    url?: string;
    size?: number | string;
    type?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  client_id: string;
  created_at: string;
  title?: string;
  name?: string;
  type?: string;
  size?: number;
  file_size?: number;
  uploadedAt?: string;
  metadata: {
    processing_status?: string;
    raw_text?: string;
    content?: string;
    [key: string]: any;
  };
  chunks?: Array<{
    id: string;
    content: string;
    chunk_index: number;
    document_id: string;
    client_id: string;
    metadata: Record<string, unknown>;
    is_training_doc?: boolean;
  }>;
  is_training_doc?: boolean;
}

export interface TokenUsageRequest {
  clientId: string;
  tokens: number;
  model: string;
  service: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
  document_id: string;
  client_id: string;
  metadata?: Record<string, unknown>;
  is_training_doc?: boolean;
}

export interface EmbeddingResult {
  chunk_id: string;
  similarity: number;
  is_training_doc: boolean;
}

export interface TokenInfo {
  used: number;
  cost?: number;
  totalTokens: number;
  totalCost: number;
  tokensUsed?: any;
  promptTokens?: number;
  completionTokens?: number;
}

export interface DateEntry {
  date: string;
  event: string;
  context?: string;
  source_document?: string;
  confidence?: number;
}

export interface ChronologyEvent {
  date: string;
  event: string;
  source: string;
}

export interface MonthlyUsage {
  month: string;
  tokens: number;
  cost: number;
}

export interface ConversationSummary {
  summary: string;
  timestamp: string;
}

export interface AIMessage {
  role: MessageRole;
  sender: "ai";
  content: string;
  timestamp: string;
}