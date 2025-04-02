export interface LetterResponse {
  success: boolean;
  response?: string;
  error?: string;
  details?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  model?: string;
} 