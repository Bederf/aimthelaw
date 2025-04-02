import { toast } from '@/components/ui/use-toast';
import { isLikelyNetworkIssue } from '@/integrations/supabase/client';

/**
 * Error types that can occur during API calls
 */
export type ApiErrorType = 
  | 'network' 
  | 'timeout' 
  | 'server' 
  | 'auth' 
  | 'validation' 
  | 'unknown';

/**
 * Structured API error with additional context
 */
export interface ApiError {
  type: ApiErrorType;
  message: string;
  originalError?: unknown;
  status?: number;
}

/**
 * Determines the type of error from an unknown error object
 */
export function getApiErrorType(error: unknown): ApiErrorType {
  // Handle network errors
  if (error instanceof TypeError && (
    error.message.includes('Failed to fetch') || 
    error.message.includes('Network request failed') ||
    error.message.includes('NetworkError')
  )) {
    return 'network';
  }
  
  // Handle timeout errors
  if (error instanceof Error && (
    error.message.includes('timeout') || 
    error.message.includes('Timed out') ||
    error.name === 'AbortError'
  )) {
    return 'timeout';
  }
  
  // Handle DOMException (often related to network issues)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'timeout';
  }
  
  // Check if it's an HTTP error with status
  if (error instanceof Response || (error instanceof Object && 'status' in error)) {
    const status = 'status' in error ? (error.status as number) : 0;
    
    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) {
        return 'auth';
      }
      if (status === 422) {
        return 'validation';
      }
      return 'server';
    }
    
    if (status >= 500) {
      return 'server';
    }
  }
  
  // Call our custom network status checker
  if (isLikelyNetworkIssue()) {
    return 'network';
  }
  
  return 'unknown';
}

/**
 * Extracts a user-friendly message from an error
 */
export function getApiErrorMessage(error: unknown): string {
  const errorType = getApiErrorType(error);
  
  // Default messages based on error type
  switch (errorType) {
    case 'network':
      return 'Network error: Please check your internet connection and try again.';
    case 'timeout':
      return 'Request timed out: The server took too long to respond. Please try again.';
    case 'auth':
      return 'Authentication error: Please sign in again.';
    case 'validation':
      return 'Validation error: Please check your input and try again.';
    case 'server':
      return 'Server error: Something went wrong on our end. We\'re working on it.';
    default:
      // Try to extract meaningful message from error object
      if (error instanceof Error) {
        return error.message || 'An unexpected error occurred.';
      }
      
      if (typeof error === 'string') {
        return error;
      }
      
      if (error instanceof Object && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }
      
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Creates a structured API error from an unknown error
 */
export function createApiError(error: unknown): ApiError {
  const type = getApiErrorType(error);
  const message = getApiErrorMessage(error);
  
  const apiError: ApiError = {
    type,
    message,
    originalError: error
  };
  
  // Try to extract status code
  if (error instanceof Response) {
    apiError.status = error.status;
  } else if (error instanceof Object && 'status' in error && typeof error.status === 'number') {
    apiError.status = error.status;
  }
  
  return apiError;
}

/**
 * Handles an API error by showing appropriate toast notification and logging
 */
export function handleApiError(error: unknown, customMessage?: string): ApiError {
  const apiError = createApiError(error);
  
  // Log for debugging
  console.error('[API Error]', {
    type: apiError.type,
    message: apiError.message,
    status: apiError.status,
    originalError: apiError.originalError
  });
  
  // Show toast with appropriate message
  toast({
    title: customMessage || getErrorTitle(apiError.type),
    description: apiError.message,
    variant: getErrorVariant(apiError.type),
    duration: 5000
  });
  
  return apiError;
}

/**
 * Gets the appropriate toast title based on error type
 */
function getErrorTitle(type: ApiErrorType): string {
  switch (type) {
    case 'network':
      return 'Connection Problem';
    case 'timeout':
      return 'Request Timeout';
    case 'server':
      return 'Server Error';
    case 'auth':
      return 'Authentication Error';
    case 'validation':
      return 'Validation Error';
    default:
      return 'Error';
  }
}

/**
 * Gets the appropriate toast variant based on error type
 */
function getErrorVariant(type: ApiErrorType): 'default' | 'destructive' {
  switch (type) {
    case 'network':
    case 'timeout':
      return 'default';
    default:
      return 'destructive';
  }
} 