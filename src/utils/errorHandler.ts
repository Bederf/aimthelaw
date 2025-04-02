import { toast } from "@/components/ui/use-toast";

// Error types
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  SERVER = 'server',
  API_RESPONSE = 'api_response',
  VALIDATION = 'validation',
  TOKEN_LIMIT = 'token_limit',
  CONTENT_FILTER = 'content_filter',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

// Interface for error handling
export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  throwError?: boolean;
  sendToMonitoring?: boolean;
}

// Default options
const defaultOptions: ErrorHandlingOptions = {
  showToast: true,
  logToConsole: true,
  throwError: false,
  sendToMonitoring: true
};

/**
 * Error classification function that determines the type of error
 */
export function classifyError(error: any): ErrorType {
  // Network errors
  if (!navigator.onLine || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
    return ErrorType.NETWORK;
  }
  
  // Authentication errors
  if (error.response?.status === 401 || error.response?.status === 403) {
    return ErrorType.AUTHENTICATION;
  }
  
  // Server errors
  if (error.response?.status >= 500) {
    return ErrorType.SERVER;
  }
  
  // API response errors
  if (error.response?.status >= 400 && error.response?.status < 500) {
    return ErrorType.API_RESPONSE;
  }
  
  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return ErrorType.VALIDATION;
  }
  
  // Token limit errors
  if (error.message?.includes('token') && error.message?.includes('limit')) {
    return ErrorType.TOKEN_LIMIT;
  }
  
  // Content filter errors
  if (error.message?.includes('content filter') || error.message?.includes('Content violates')) {
    return ErrorType.CONTENT_FILTER;
  }
  
  // Rate limit errors
  if (error.message?.includes('rate limit') || error.response?.status === 429) {
    return ErrorType.RATE_LIMIT;
  }
  
  // Default to unknown
  return ErrorType.UNKNOWN;
}

/**
 * Get a user-friendly error message based on the error type
 */
export function getUserFriendlyErrorMessage(error: any, errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return "Network connection issue. Please check your internet connection and try again.";
    
    case ErrorType.AUTHENTICATION:
      return "You don't have permission to access this resource or your session has expired. Please log in again.";
    
    case ErrorType.SERVER:
      return "The server encountered an error. Our team has been notified and is working to fix the issue.";
    
    case ErrorType.API_RESPONSE:
      return error.response?.data?.detail || 
             error.response?.data?.message || 
             "There was an issue with your request. Please check your input and try again.";
    
    case ErrorType.VALIDATION:
      return "Invalid input data. Please check your information and try again.";
    
    case ErrorType.TOKEN_LIMIT:
      return "The conversation has reached the token limit. Please start a new conversation or remove some context.";
    
    case ErrorType.CONTENT_FILTER:
      return "Your request contains content that cannot be processed. Please modify your input and try again.";
    
    case ErrorType.RATE_LIMIT:
      return "You've reached the rate limit. Please wait a moment before making more requests.";
    
    case ErrorType.UNKNOWN:
    default:
      return error.message || "An unexpected error occurred. Please try again later.";
  }
}

/**
 * Get additional guidance based on the error type
 */
export function getErrorGuidance(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return "Try refreshing the page or checking your Wi-Fi connection.";
    
    case ErrorType.AUTHENTICATION:
      return "Your authentication may have expired. Try logging out and back in.";
    
    case ErrorType.SERVER:
      return "This is usually a temporary issue. Please try again in a few minutes.";
    
    case ErrorType.API_RESPONSE:
      return "Double-check your input or try using different parameters.";
    
    case ErrorType.VALIDATION:
      return "Review your input for any errors or missing information.";
    
    case ErrorType.TOKEN_LIMIT:
      return "Try starting a new conversation or limiting the context you provide.";
    
    case ErrorType.CONTENT_FILTER:
      return "Modify your request to avoid potentially sensitive topics.";
    
    case ErrorType.RATE_LIMIT:
      return "Wait a few moments and try again. Consider spacing out your requests.";
    
    case ErrorType.UNKNOWN:
    default:
      return "If this issue persists, please contact support.";
  }
}

/**
 * Main error handling function
 */
export function handleError(error: any, options: ErrorHandlingOptions = {}): { 
  errorType: ErrorType;
  message: string;
  guidance: string;
  original: any;
} {
  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Classify the error
  const errorType = classifyError(error);
  
  // Get user-friendly message
  const message = getUserFriendlyErrorMessage(error, errorType);
  
  // Get guidance
  const guidance = getErrorGuidance(errorType);
  
  // Log to console if enabled
  if (mergedOptions.logToConsole) {
    console.error(`Error (${errorType}):`, error);
    console.error('User message:', message);
    console.error('Guidance:', guidance);
  }
  
  // Show toast if enabled
  if (mergedOptions.showToast) {
    toast({
      title: `Error: ${errorType}`,
      description: `${message} ${guidance}`,
      variant: 'destructive',
      duration: 5000
    });
  }
  
  // Send to monitoring if enabled
  if (mergedOptions.sendToMonitoring) {
    // Implement your monitoring service integration here
    // Example: errorMonitoringService.logError(error, { type: errorType, message, guidance });
    console.info('Error would be sent to monitoring service');
  }
  
  // Throw error if enabled
  if (mergedOptions.throwError) {
    throw error;
  }
  
  // Return error info
  return {
    errorType,
    message,
    guidance,
    original: error
  };
}

/**
 * Create a typed error with additional information
 */
export class AppError extends Error {
  type: ErrorType;
  guidance: string;
  details?: any;
  
  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, guidance?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.guidance = guidance || getErrorGuidance(type);
    this.details = details;
  }
}

/**
 * Options for the error handling wrapper
 */
export interface ErrorHandlingOptions<T> {
  errorTitle?: string;
  errorMessage?: string;
  successTitle?: string;
  successMessage?: string;
  logError?: boolean;
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
}

/**
 * A wrapper function to standardize error handling across the application
 * 
 * @param operation The async operation to perform
 * @param options Configuration options for error handling
 * @returns The result of the operation or null if it failed
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions<T> = {}
): Promise<T | null> {
  try {
    const result = await operation();
    
    if (options.successTitle) {
      toast({
        title: options.successTitle,
        description: options.successMessage
      });
    }
    
    if (options.onSuccess) {
      options.onSuccess(result);
    }
    
    return result;
  } catch (error: any) {
    if (options.logError !== false) {
      console.error(options.errorTitle || 'Operation failed:', error);
    }
    
    toast({
      variant: 'destructive',
      title: options.errorTitle || 'Error',
      description: error.message || options.errorMessage || 'An unexpected error occurred'
    });
    
    if (options.onError) {
      options.onError(error);
    }
    
    return null;
  }
} 