import { supabase } from '@/integrations/supabase/client';

/**
 * Parses an API response and handles common error scenarios
 * 
 * @param response The fetch Response object
 * @returns The parsed JSON response
 * @throws Error with details if the response is not ok
 */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail || errorData);
    } catch (e) {
      // If JSON parsing fails, use statusText as fallback
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  
  return response.json();
}

/**
 * Gets an access token for authenticated API requests
 * 
 * @returns The access token
 * @throws Error if not authenticated
 */
export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Not authenticated');
  }
  return data.session.access_token;
}

/**
 * Makes an authenticated API request
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The parsed response
 */
export async function authenticatedFetch<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  return parseApiResponse<T>(response);
} 