/**
 * Supabase Utilities
 * 
 * This file contains utility functions for Supabase integration,
 * including configuration verification and common auth error handling.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Verifies if Supabase is properly configured with a valid API key
 * @returns {Promise<{valid: boolean, message: string}>} Result of verification
 */
export async function verifySupabaseConfig(): Promise<{valid: boolean, message: string}> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Check environment variables
  if (!supabaseUrl) {
    return {
      valid: false,
      message: "Missing Supabase URL in environment variables"
    };
  }
  
  if (!supabaseKey) {
    return {
      valid: false,
      message: "Missing Supabase API key in environment variables"
    };
  }
  
  // Test connection with a simple query
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      if (error.message.includes("Invalid API key")) {
        return {
          valid: false,
          message: "Invalid Supabase API key. Please check your configuration."
        };
      }
      
      return {
        valid: false,
        message: `Supabase connection error: ${error.message}`
      };
    }
    
    return {
      valid: true,
      message: "Supabase configuration verified successfully"
    };
  } catch (e) {
    return {
      valid: false,
      message: `Failed to verify Supabase connection: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/**
 * Handles common Supabase authentication errors
 * @param {any} error The error object from Supabase auth operations
 * @returns {string} User-friendly error message
 */
export function handleAuthError(error: any): string {
  if (!error) return "Unknown error";
  
  const errorMessage = error.message || String(error);
  
  // Map common error messages to user-friendly messages
  if (errorMessage.includes("Invalid API key")) {
    return "System configuration error. Please contact support.";
  }
  
  if (errorMessage.includes("Invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  
  if (errorMessage.includes("Email not confirmed")) {
    return "Your email has not been verified. Please check your inbox for a verification email.";
  }
  
  if (errorMessage.includes("JWT")) {
    return "Your session has expired. Please log in again.";
  }
  
  if (errorMessage.includes("rate limit")) {
    return "Too many login attempts. Please try again later.";
  }
  
  // Default to the original error message
  return errorMessage;
}

/**
 * Checks if a user is authenticated
 * @returns {Promise<boolean>} True if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch (e) {
    console.error("Error checking authentication status:", e);
    return false;
  }
}

/**
 * Logs out the current user
 * @returns {Promise<{success: boolean, message: string}>} Result of logout
 */
export async function logoutUser(): Promise<{success: boolean, message: string}> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        message: `Logout failed: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: "Logged out successfully"
    };
  } catch (e) {
    return {
      success: false,
      message: `Logout error: ${e instanceof Error ? e.message : String(e)}`
    };
  }
} 