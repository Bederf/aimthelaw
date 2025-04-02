/**
 * Supabase compatibility utilities for handling API changes between versions
 * 
 * This file provides wrapper functions to handle differences between Supabase SDK versions
 * to make the code more robust to version upgrades.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current session safely, handling different Supabase versions
 * 
 * Modern versions use getSession() which returns a Promise
 * Older versions used session() which returned the session directly
 * 
 * @returns Promise that resolves to the current session
 */
export async function getSession() {
  try {
    // Try the modern approach first (getSession)
    if (typeof supabase.auth.getSession === 'function') {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
    
    // Fall back to old approach if available
    // @ts-ignore - Ignoring because session() is deprecated
    if (typeof supabase.auth.session === 'function') {
      // @ts-ignore - Ignoring because session() is deprecated
      return supabase.auth.session();
    }
    
    // If neither method exists, return null
    console.warn('Could not get session: No compatible method found');
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Safe wrapper for refreshing the session
 * 
 * @returns Promise with the refreshed session
 */
export async function refreshSession() {
  try {
    // Modern approach
    if (typeof supabase.auth.refreshSession === 'function') {
      return await supabase.auth.refreshSession();
    }
    
    // Legacy fallback
    // @ts-ignore - Ignoring because refreshToken() might be deprecated
    if (typeof supabase.auth.refreshToken === 'function') {
      // @ts-ignore - Ignoring because refreshToken() might be deprecated
      return await supabase.auth.refreshToken();
    }
    
    throw new Error('No compatible session refresh method found');
  } catch (error) {
    console.error('Error refreshing session:', error);
    throw error;
  }
}

/**
 * Get user data from the session safely
 * 
 * @returns The current user or null
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
} 