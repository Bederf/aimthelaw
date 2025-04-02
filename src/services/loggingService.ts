import { API_BASE_URL } from '@/lib/api';

export interface LogEntry {
  level: 'info' | 'warning' | 'error';
  service: string;
  action: string;
  client_id?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: any;
  timestamp?: string;
}

class LoggingService {
  // Add throttling to reduce log frequency
  private lastLogTime: Record<string, number> = {};
  private logThrottleMs: number = 5000; // Only log the same service+action once every 5 seconds
  private debugMode: boolean = false; // Set to true to enable more verbose logging

  private shouldThrottleLog(service: string, action: string): boolean {
    // Always log errors regardless of throttling
    if (action.includes('error') || service.includes('error')) {
      return false;
    }

    const key = `${service}:${action}`;
    const now = Date.now();
    const lastTime = this.lastLogTime[key] || 0;
    
    // If it's been less than the throttle time, don't log
    if (now - lastTime < this.logThrottleMs) {
      return true;
    }
    
    // Update the last log time
    this.lastLogTime[key] = now;
    return false;
  }

  private async writeToFile(entry: LogEntry) {
    try {
      // Skip throttled logs
      if (this.shouldThrottleLog(entry.service, entry.action)) {
        return;
      }

      // Format error object to be serializable
      let formattedError = null;
      if (entry.error) {
        if (entry.error instanceof Error) {
          formattedError = {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          };
        } else {
          // Try to stringify the error if it's not an Error object
          try {
            formattedError = JSON.stringify(entry.error);
          } catch (e) {
            formattedError = String(entry.error);
          }
        }
      }

      // Format metadata to ensure it's serializable
      let formattedMetadata = entry.metadata ? { ...entry.metadata } : {};
      
      // Ensure client_id is a string
      const formattedClientId = entry.client_id ? String(entry.client_id) : null;
      
      const logEntry = {
        level: entry.level,
        service: entry.service,
        action: entry.action,
        client_id: formattedClientId,
        message: entry.message,
        metadata: formattedMetadata,
        error: formattedError,
        timestamp: entry.timestamp || new Date().toISOString()
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development' && this.debugMode) {
        const consoleMethod = entry.level === 'error' ? console.error :
                            entry.level === 'warning' ? console.warn :
                            console.log;
        
        consoleMethod(
          `[${entry.service}] ${entry.action}:`,
          {
            message: entry.message,
            metadata: formattedMetadata,
            error: formattedError,
            timestamp: logEntry.timestamp
          }
        );
      }

      // Send log to backend to be written to file
      try {
        const response = await fetch(`${API_BASE_URL}/api/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logEntry)
        });

        if (!response.ok && this.debugMode) {
          const errorText = await response.text();
          console.error(`Error writing to log file (${response.status}): ${errorText}`);
        }
      } catch (fetchError) {
        if (this.debugMode) {
          console.error('Network error writing to log file:', fetchError);
        }
        // Continue execution - don't let logging failures affect the application
      }
    } catch (error) {
      if (this.debugMode) {
        console.error('Error in logging service:', error);
      }
      // Don't throw the error - logging failures shouldn't break the app
    }
  }

  async info(service: string, action: string, message: string, metadata?: Record<string, any>, client_id?: string) {
    await this.writeToFile({
      level: 'info',
      service,
      action,
      message,
      metadata,
      client_id
    });
  }

  async warn(service: string, action: string, message: string, metadata?: Record<string, any>, client_id?: string) {
    await this.writeToFile({
      level: 'warning',
      service,
      action,
      message,
      metadata,
      client_id
    });
  }

  async error(service: string, action: string, message: string, error?: any, metadata?: Record<string, any>, client_id?: string) {
    await this.writeToFile({
      level: 'error',
      service,
      action,
      message,
      error,
      metadata,
      client_id
    });
  }

  async logAPICall(service: string, action: string, request: any, response: any, client_id?: string) {
    try {
      const metadata = {
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers ? { ...request.headers } : {}
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          body: null as any
        }
      };

      // Try to get the response body only if the response is OK
      if (response.ok) {
        try {
          const cloned = response.clone();
          metadata.response.body = await cloned.json().catch(() => null);
        } catch (e) {
          metadata.response.body = null;
        }
      }

      await this.writeToFile({
        level: 'info',
        service,
        action,
        message: 'API Call',
        metadata,
        client_id
      });
    } catch (error) {
      if (this.debugMode) {
        console.error('Error logging API call:', error);
      }
      // Don't throw - logging failures shouldn't break the app
    }
  }

  async logTokenUsage(client_id: string, action: string, tokenUsage: any, cost: number) {
    try {
      // Ensure tokenUsage is serializable
      const safeTokenUsage = tokenUsage ? {
        prompt_tokens: tokenUsage.prompt_tokens || 0,
        completion_tokens: tokenUsage.completion_tokens || 0,
        total_tokens: tokenUsage.total_tokens || 0
      } : {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
      
      await this.writeToFile({
        level: 'info',
        service: 'AI',
        action: 'token_usage',
        message: `Token usage for ${action}`,
        metadata: {
          token_usage: safeTokenUsage,
          cost: cost || 0,
          action
        },
        client_id: client_id ? String(client_id) : null
      });
    } catch (error) {
      console.error('Error logging token usage:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }
}

export const loggingService = new LoggingService(); 