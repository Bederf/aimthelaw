import { ReactElement } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current authentication token
 * @returns Promise<string | null> The auth token if available
 */
export const getToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Helper function to navigate users to their appropriate dashboard based on role
 * @param role User role (admin, lawyer, client)
 * @param userId User ID (required for lawyer role)
 * @param navigate Function to handle navigation (can be React Router's navigate or a wrapper for Navigate component)
 * @returns React element if navigate returns one, undefined otherwise
 */
export const navigateByRole = (
  role: string | null,
  userId: string | undefined,
  navigate: (path: string) => void | ReactElement
): void | ReactElement => {
  console.log('[navigateByRole] Starting with role:', role, 'userId:', userId);
  
  if (!role) {
    console.warn('[navigateByRole] No role provided for navigation, redirecting to home');
    return navigate('/');
  }
  
  let targetPath = '/';
  
  switch (role) {
    case 'admin':
      targetPath = '/admin/dashboard';
      console.log('[navigateByRole] Admin role detected, target path:', targetPath);
      break;
    case 'lawyer':
      if (!userId) {
        console.warn('[navigateByRole] Lawyer role requires userId but none provided');
        return navigate('/');
      }
      targetPath = `/lawyer/dashboard/${userId}`;
      console.log('[navigateByRole] Lawyer role detected, target path:', targetPath);
      break;
    case 'client':
      targetPath = '/client/dashboard';
      console.log('[navigateByRole] Client role detected, target path:', targetPath);
      break;
    default:
      console.log('[navigateByRole] Unknown role, redirecting to home');
      targetPath = '/';
  }
  
  try {
    console.log('[navigateByRole] Calling navigate with path:', targetPath);
    const result = navigate(targetPath);
    console.log('[navigateByRole] Navigation completed');
    return result;
  } catch (error) {
    console.error('[navigateByRole] Error during navigation:', error);
    return navigate('/');
  }
}; 