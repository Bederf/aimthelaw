import { apiClient } from './resilientApiClient';
import { User } from '@supabase/supabase-js';

// Higher timeout values specifically for auth operations
const AUTH_TIMEOUT = 40000; // 40 seconds
const AUTH_RETRIES = 4;     // 4 retry attempts

// Interface for auth endpoints
interface AuthApi {
  /**
   * Check if the current authentication token is valid
   */
  validateToken(): Promise<{ valid: boolean; user?: User }>;
  
  /**
   * Refresh the current authentication token
   */
  refreshToken(): Promise<{ success: boolean; token?: string }>;
  
  /**
   * Logout and invalidate the current auth token
   */
  logout(): Promise<{ success: boolean }>;
}

/**
 * Auth API client implementation with enhanced error handling and timeouts
 */
class AuthApiClient implements AuthApi {
  /**
   * Initialize with auth-specific options
   */
  constructor() {
    console.info('[AuthApiClient] Initialized with extended timeouts');
  }

  /**
   * Check if the current token is valid
   */
  async validateToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await apiClient.get('/auth/validate', {
        timeout: AUTH_TIMEOUT,
        retries: AUTH_RETRIES,
        retryDelay: 2000,
        cache: false, // Don't cache auth validation
      });
      return response;
    } catch (error) {
      console.warn('[AuthApiClient] Token validation failed:', error.message);
      
      // Check if device is offline or having network issues
      if (!navigator.onLine || error.message.includes('network') || error.message.includes('timeout')) {
        console.warn('[AuthApiClient] Network appears to be offline or unstable');
        
        // Try to get cached user from localStorage as fallback
        try {
          const cachedUser = localStorage.getItem('ai_law_cached_user');
          if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            if (userData.expires > Date.now()) {
              console.info('[AuthApiClient] Using cached credentials for offline mode');
              return { 
                valid: true, 
                user: userData.user,
                offline: true
              };
            }
          }
        } catch (e) {
          console.error('[AuthApiClient] Error accessing cached user data:', e);
        }
      }
      
      return { valid: false };
    }
  }

  /**
   * Refresh the current auth token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string }> {
    try {
      const response = await apiClient.post('/auth/refresh', {}, {
        timeout: AUTH_TIMEOUT,
        retries: AUTH_RETRIES,
        retryDelay: 2000,
        cache: false,
      });
      
      if (response.token) {
        // Update apiClient with new token
        apiClient.setAuthToken(response.token);
        
        // Store refresh timestamp
        try {
          localStorage.setItem('auth_last_refresh_time', Date.now().toString());
        } catch (e) {
          console.warn('[AuthApiClient] Failed to store auth refresh timestamp:', e);
        }
        
        return { success: true, token: response.token };
      }
      
      return { success: false };
    } catch (error) {
      console.error('[AuthApiClient] Token refresh failed:', error.message);
      
      // If it's a network error during refresh, consider returning success
      // to prevent logout cascade during temporary network issues
      if (!navigator.onLine || error.message.includes('network') || error.message.includes('timeout')) {
        console.warn('[AuthApiClient] Network issue during token refresh, assuming still valid');
        return { 
          success: true, 
          assumedValid: true 
        };
      }
      
      return { success: false };
    }
  }

  /**
   * Logout from the API
   */
  async logout(): Promise<{ success: boolean }> {
    // If offline, just return success without attempting API call
    if (!navigator.onLine) {
      console.warn('[AuthApiClient] Offline logout - skipping API call');
      return { success: true };
    }
    
    try {
      const response = await apiClient.post('/auth/logout', {}, {
        timeout: 10000, // Shorter timeout for logout
        retries: 1,     // Only retry once for logout
        cache: false,
      });
      
      return { success: true };
    } catch (error) {
      console.error('[AuthApiClient] Logout error:', error.message);
      // For logout, we consider it successful even if API fails
      // to ensure user can always log out
      return { success: true };
    } finally {
      // Clear any cached auth data
      apiClient.clearCache();
    }
  }

  /**
   * Set auth token in the API client
   */
  setAuthToken(token: string): void {
    apiClient.setAuthToken(token);
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient();

// Default export
export default authApiClient; 