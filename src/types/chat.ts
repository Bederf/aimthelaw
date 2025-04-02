export type MessageType = 
  | 'user' 
  | 'assistant' 
  | 'system' 
  | 'action_result' 
  | 'action_complete' 
  | 'error' 
  | 'processing'
  | 'action_start'
  | 'retry'
  | 'action_result_details'
  | 'action_selection';

export enum MessageSender {
  USER = "user",
  AI = "ai",
  SYSTEM = "system"
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system"
}

export interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: Date;
  metadata?: Record<string, any>;
  role: MessageRole;
}

export interface ExtendedMessage extends Message {
  metadata?: {
    type?: string;
    token_usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost?: number;
    sources?: any[];
    error_type?: string;
    action?: string;
    document_id?: string;
    success?: boolean;
    warning?: string;
  };
}

export interface ExtendedMetadata {
  type?: string;
  action?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  sources?: Array<{
    id: string;
    content: string;
    metadata: {
      documentId: string;
      chunkIndex: number;
    };
  }>;
  error_type?: string;
  info_type?: string;
  files?: string[];
  insights?: any;
  attempt?: number;
  structured?: boolean;
  timeline_type?: 'chronological' | 'confidence';
}

export interface AIMessage extends ExtendedMessage {
  role: MessageRole.ASSISTANT;
  sender: MessageSender.AI;
}

export interface AIResponse {
  message: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  conversation_id?: string;
  sources?: Array<{
    id: string;
    content: string;
    metadata: {
      documentId: string;
      chunkIndex: number;
    };
  }>;
}
