import { isLikelyNetworkIssue } from "@/integrations/supabase/client";
import { createApiError, handleApiError, getApiErrorType } from "@/utils/api-error-handler";

interface ApiClientOptions {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  cache?: boolean; // Enable caching for GET requests
  cacheTTL?: number; // Cache time-to-live in milliseconds
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

// In-memory cache for API responses
const responseCache = new Map<string, { data: any; timestamp: number }>();

// Default options
const defaultOptions: ApiClientOptions = {
  baseUrl: 'http://localhost:8000', // Default to local development
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000,
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * Resilient API client that handles network issues, retries, and offline support
 */
export class ResilientApiClient {
  private options: ApiClientOptions;

  constructor(options: Partial<ApiClientOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Make a request with improved error handling and retry logic
   */
  async request<T = any>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.options.baseUrl}${endpoint}`;
    
    const requestId = Math.random().toString(36).substring(2, 9);
    const requestOptions: FetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.options.headers,
        ...options.headers,
      },
      timeout: options.timeout ?? this.options.timeout,
      retries: options.retries ?? this.options.retries,
      retryDelay: options.retryDelay ?? this.options.retryDelay,
      cache: options.cache ?? this.options.cache,
      cacheTTL: options.cacheTTL ?? this.options.cacheTTL,
    };

    // If network is offline, check cache or fail immediately
    if (!navigator.onLine) {
      console.warn(`🔄 [${requestId}] Network is offline`);
      
      // For GET requests, try to return cached data
      if (options.method === 'GET' && requestOptions.cache) {
        const cacheKey = this.getCacheKey(url, requestOptions);
        const cachedResponse = responseCache.get(cacheKey);
        
        if (cachedResponse) {
          console.info(`📦 [${requestId}] Returning cached response for ${url}`);
          return cachedResponse.data as T;
        }
      }
      
      // For non-GET requests or if no cache, throw network error
      throw new Error('Network is offline');
    }

    // Check if we should use cached response
    if (options.method === 'GET' && requestOptions.cache) {
      const cacheKey = this.getCacheKey(url, requestOptions);
      const cachedResponse = responseCache.get(cacheKey);
      
      if (cachedResponse) {
        const now = Date.now();
        const cacheAge = now - cachedResponse.timestamp;
        
        // If cache is still fresh, return it
        if (cacheAge < requestOptions.cacheTTL!) {
          console.info(`📦 [${requestId}] Returning cached response for ${url} (age: ${cacheAge}ms)`);
          return cachedResponse.data as T;
        } else {
          // Cache expired, remove it
          console.info(`📦 [${requestId}] Cache expired for ${url}, fetching fresh data`);
          responseCache.delete(cacheKey);
        }
      }
    }

    // Attempt the request with retries
    let lastError: Error | null = null;
    let attempt = 0;
    
    while (attempt <= requestOptions.retries!) {
      try {
        console.info(`🔄 [${requestId}] Request attempt ${attempt + 1}/${requestOptions.retries! + 1} to ${url}`);
        
        // Set up timeout using AbortController
        const controller = new AbortController();
        const timeoutId = requestOptions.timeout 
          ? setTimeout(() => controller.abort(), requestOptions.timeout) 
          : null;
        
        if (!requestOptions.signal) {
          requestOptions.signal = controller.signal;
        }
        
        // Make the request
        const startTime = Date.now();
        const response = await fetch(url, requestOptions);
        const elapsed = Date.now() - startTime;
        
        // Clear timeout if it was set
        if (timeoutId) clearTimeout(timeoutId);
        
        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          const errorMessage = errorData.message || `HTTP error ${response.status}`;
          throw new Error(errorMessage);
        }
        
        // Parse response data
        const contentType = response.headers.get('content-type');
        let data: T;
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text() as unknown as T;
        }
        
        console.info(`✅ [${requestId}] Request to ${url} succeeded in ${elapsed}ms`);
        
        // Cache successful GET responses
        if (options.method === 'GET' && requestOptions.cache) {
          const cacheKey = this.getCacheKey(url, requestOptions);
          responseCache.set(cacheKey, { data, timestamp: Date.now() });
          console.info(`📦 [${requestId}] Cached response for ${url}`);
        }
        
        return data;
      } catch (error) {
        lastError = error as Error;
        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');
        const isNetworkError = 
          error.message.includes('network') || 
          error.message.includes('failed') ||
          isLikelyNetworkIssue();
          
        console.warn(`❌ [${requestId}] Request attempt ${attempt + 1} failed: ${error.message}`);
        
        // Don't retry if it's not a network/timeout error (unless it's the last attempt)
        if (!isTimeout && !isNetworkError && attempt < requestOptions.retries!) {
          break;
        }
        
        // Retry if we have attempts left
        if (attempt < requestOptions.retries!) {
          const delay = this.getRetryDelay(attempt, requestOptions.retryDelay!);
          console.info(`⏱️ [${requestId}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        } else {
          // We've exhausted all retries
          break;
        }
      }
    }
    
    // For GET requests with cache when all retries failed, try to return stale data
    if (options.method === 'GET' && requestOptions.cache) {
      const cacheKey = this.getCacheKey(url, requestOptions);
      const cachedResponse = responseCache.get(cacheKey);
      
      if (cachedResponse) {
        console.warn(`📦 [${requestId}] Returning stale cached data after all retries failed`);
        return cachedResponse.data as T;
      }
    }
    
    // All retries failed
    if (lastError) {
      console.error(`❌ [${requestId}] All ${requestOptions.retries! + 1} request attempts to ${url} failed`);
      throw lastError;
    }
    
    // This should never happen
    throw new Error('Unexpected error in request');
  }

  // Helper method to get cache key
  private getCacheKey(url: string, options: FetchOptions): string {
    // Create a unique key based on URL and relevant options
    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    return `${options.method || 'GET'}-${url}-${bodyStr}`;
  }

  // Helper method to calculate retry delay with exponential backoff and jitter
  private getRetryDelay(attempt: number, baseDelay: number): number {
    const expBackoff = baseDelay * Math.pow(1.5, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return expBackoff + jitter;
  }

  // Convenience methods for common HTTP methods
  async get<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(endpoint: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Method to clear cache
  clearCache(): void {
    responseCache.clear();
    console.info('📦 API response cache cleared');
  }

  // Method to set auth token
  setAuthToken(token: string): void {
    this.options.headers = {
      ...this.options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
}

// Create and export a singleton instance with default options
export const apiClient = new ResilientApiClient();

// Export default for convenience
export default apiClient; 