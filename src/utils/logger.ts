/**
 * Centralized logging utility that wraps loggingService and console
 * 
 * Benefits:
 * - Consistent logging interface across the app
 * - Environment-aware (less verbose in production)
 * - Automatically sends logs to backend in production
 * - Provides better type safety and formatting
 */

import { loggingService } from '@/services/loggingService';

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Default service name if none provided
const DEFAULT_SERVICE = 'app';

interface LogOptions {
  service?: string;
  action?: string;
  metadata?: Record<string, any>;
  clientId?: string;
  sendToServer?: boolean; // Whether to send to backend API via loggingService
}

class Logger {
  /**
   * Log information message
   */
  info(message: string, options: LogOptions = {}) {
    const {
      service = DEFAULT_SERVICE,
      action = 'info',
      metadata = {},
      clientId,
      sendToServer = !isDev // Send to server by default in production, but not in dev
    } = options;

    // Always log to console in development
    if (isDev) {
      console.log(`[${service}] ${message}`, metadata);
    }

    // Send to backend logging service
    if (sendToServer) {
      try {
        loggingService.info(service, action, message, metadata, clientId).catch(e => {
          // Fallback to console if backend logging fails
          if (isDev) console.error('Failed to log to server:', e);
        });
      } catch (e) {
        // If the method call itself fails (e.g., method doesn't exist)
        if (isDev) console.error('Error calling loggingService.info:', e);
      }
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, options: LogOptions = {}) {
    const {
      service = DEFAULT_SERVICE,
      action = 'warning',
      metadata = {},
      clientId,
      sendToServer = true // Always send warnings to server
    } = options;

    // Always log warnings to console
    console.warn(`[${service}] ${message}`, metadata);

    // Send to backend logging service
    if (sendToServer) {
      try {
        loggingService.warn(service, action, message, metadata, clientId).catch(e => {
          if (isDev) console.error('Failed to log warning to server:', e);
        });
      } catch (e) {
        // If the method call itself fails
        if (isDev) console.error('Error calling loggingService.warn:', e);
      }
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: any, options: LogOptions = {}) {
    const {
      service = DEFAULT_SERVICE,
      action = 'error',
      metadata = {},
      clientId,
      sendToServer = true // Always send errors to server
    } = options;

    // Always log errors to console
    console.error(`[${service}] ${message}`, error, metadata);

    // Send to backend logging service
    if (sendToServer) {
      try {
        loggingService.error(service, action, message, error, metadata, clientId).catch(e => {
          console.error('Failed to log error to server:', e);
        });
      } catch (e) {
        // If the method call itself fails
        if (isDev) console.error('Error calling loggingService.error:', e);
      }
    }
  }

  /**
   * Log API call (with request and response)
   */
  apiCall(request: any, response: any, options: LogOptions = {}) {
    const {
      service = 'api',
      action = 'request',
      clientId,
      sendToServer = !isDev
    } = options;

    // In development, log API calls to console
    if (isDev) {
      console.log(`[${service}] API ${request.method} ${request.url}`, {
        status: response.status,
        statusText: response.statusText
      });
    }

    // Send to backend in production
    if (sendToServer && typeof loggingService.logAPICall === 'function') {
      try {
        loggingService.logAPICall(service, action, request, response, clientId).catch(e => {
          if (isDev) console.error('Failed to log API call to server:', e);
        });
      } catch (e) {
        // If the method call itself fails
        if (isDev) console.error('Error calling loggingService.logAPICall:', e);
      }
    }
  }

  /**
   * Log token usage (special case for AI operations)
   */
  tokenUsage(clientId: string, action: string, tokenUsage: any, cost: number) {
    // Log to console in development
    if (isDev) {
      console.log(`[AI] Token usage for ${action}:`, {
        prompt_tokens: tokenUsage?.prompt_tokens || 0,
        completion_tokens: tokenUsage?.completion_tokens || 0,
        total_tokens: tokenUsage?.total_tokens || 0,
        cost: cost || 0
      });
    }

    // Check if logTokenUsage method exists before calling it
    if (typeof loggingService.logTokenUsage === 'function') {
      // Always send token usage to server for billing/monitoring
      try {
        loggingService.logTokenUsage(clientId, action, tokenUsage, cost).catch(e => {
          if (isDev) console.error('Failed to log token usage to server:', e);
        });
      } catch (e) {
        // If the method doesn't exist or other error
        if (isDev) {
          console.error('Error calling loggingService.logTokenUsage:', e);
          console.info('Falling back to standard info logging for token usage');
          // Fallback to standard info logging
          this.info(`Token usage for ${action}`, {
            service: 'AI',
            action: 'tokenUsage',
            metadata: {
              clientId,
              tokenUsage,
              cost
            },
            sendToServer: true
          });
        }
      }
    } else {
      // Fallback if method doesn't exist
      if (isDev) console.info('loggingService.logTokenUsage not available, using fallback');
      // Use standard info logging as fallback
      this.info(`Token usage for ${action}`, {
        service: 'AI',
        action: 'tokenUsage',
        metadata: {
          clientId,
          prompt_tokens: tokenUsage?.prompt_tokens || 0,
          completion_tokens: tokenUsage?.completion_tokens || 0,
          total_tokens: tokenUsage?.total_tokens || 0,
          cost: cost || 0
        },
        clientId,
        sendToServer: true
      });
    }
  }
}

// Export a singleton instance
export const logger = new Logger(); 