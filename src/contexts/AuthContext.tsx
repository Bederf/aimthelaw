import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  isLoading: true,
  isAuthenticated: false,
});

// Cache keys
const USER_ROLE_CACHE_KEY = 'user_role_cache';
const CACHE_EXPIRY_KEY = 'user_role_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Add a variable to track the last token refresh time
let lastTokenRefreshTime = 0;
const TOKEN_REFRESH_COOLDOWN = 5000; // 5 seconds cooldown

// Add retry configuration
const AUTH_RETRY_ATTEMPTS = 3;
const AUTH_RETRY_DELAY = 1000; // 1 second
const AUTH_CHECK_TIMEOUT = 5000; // 5 seconds

// Add a debounce flag to prevent rapid session state changes
let isSessionCheckInProgress = false;
let pendingAuthStateChange = false;
// Add cooldown timer for session checks
const SESSION_CHECK_COOLDOWN = 2000; // 2 seconds
let lastSessionCheckTime = 0;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [authRetryCount, setAuthRetryCount] = useState(0);
  
  const isAuthenticated = !!user && !!userRole;
  
  // Remove Router hooks that require Router context
  // const location = useLocation();
  // const navigate = useNavigate();
  
  // Use direct window.location instead
  const getPathname = () => window.location.pathname;
  
  // Auth state management variables
  const lastAuthCheckRef = useRef<number>(0);
  let pendingAuthStateChange = false;
  let lastTokenRefreshTime = 0;
  const checkSessionRef = useRef<boolean>(false);

  // Cache management for user roles
  const getCachedRole = (userId: string): string | null => {
    try {
      const cachedRoleData = localStorage.getItem(`user_role_${userId}`);
      if (!cachedRoleData) {
        console.log('[getCachedRole] No cached role found for user:', userId);
        return null;
      }
      
      const { role, timestamp } = JSON.parse(cachedRoleData);
      
      // Check if the cache is less than 12 hours old (valid cache)
      const now = Date.now();
      const cacheAge = now - timestamp;
      const validCache = cacheAge < 12 * 60 * 60 * 1000; // 12 hours in milliseconds
      
      if (validCache) {
        console.log('[getCachedRole] Found cached role:', role);
        return role;
      } else {
        console.log('[getCachedRole] Cache expired, will fetch fresh role');
        localStorage.removeItem(`user_role_${userId}`);
        return null;
      }
    } catch (error) {
      console.error('[getCachedRole] Error reading cached role:', error);
      return null;
    }
  };

  useEffect(() => {
    // First, check for preserved auth state from a quick action
    const preservedAuthState = sessionStorage.getItem('PRESERVED_AUTH_STATE') === 'true';
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';

    if (preservedAuthState || quickActionInProgress) {
      console.log('[AuthContext] Detected preserved auth state from quick action, restoring...');
      // If we have a preserved auth state, we need to preserve it again
      // but let the checkSession run to verify and update the user object
    }
  }, []); // Removed dependency array to run only once on mount

  useEffect(() => {
    if (user?.id) {
      const cachedRole = getCachedRole(user.id);
      if (cachedRole) {
        console.log('[AuthContext] Setting role from cache immediately:', cachedRole);
        setUserRole(cachedRole);
      }
    } else if (!user) {
      // Clear the role when user is logged out
      setUserRole(null);
    }
  }, [user]);

  // Helper function to set cached role
  const setCachedRole = (userId: string, role: string): void => {
    try {
      // Create a cache entry with timestamp
      const cacheEntry = {
        role,
        timestamp: Date.now()
      };
      
      // Store the role with the user ID as part of the key
      localStorage.setItem(`user_role_${userId}`, JSON.stringify(cacheEntry));
      console.log(`Role cached successfully for user: ${role}`);
    } catch (error) {
      console.error('[setCachedRole] Error caching role:', error);
    }
  };

  const createUserProfile = async (userData: any) => {
    console.log('[createUserProfile] Creating new profile for user:', userData.user.id);
    
    try {
      // Determine role from user_id format
      const userId = userData.user.id;
      let role = 'client'; // Default role
      
      // Parse the user_id to determine role
      if (userId.startsWith('ADM_')) {
        role = 'admin';
      } else if (userId.startsWith('LAW_')) {
        role = 'lawyer';
      } else if (userId.startsWith('CLI_')) {
        role = 'client';
      } else {
        console.warn('[createUserProfile] Unknown user_id format:', userId);
      }

      console.log('[createUserProfile] Determined role from user_id:', role);

      // Create the profile with the determined role
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          user_id: userId,  // This is the formatted ID (e.g., CLI_SNOW_771210)
          email: userData.user.email,
          first_name: userData.user.user_metadata?.first_name || '',
          last_name: userData.user.user_metadata?.last_name || '',
          role: role,
          metadata: {
            ...userData.user.user_metadata,
            created_at: new Date().toISOString(),
            email_verified: userData.user.email_confirmed_at ? true : false,
            id_number: userData.user.user_metadata?.id_number || ''
          }
        }]);
      
      if (createProfileError) {
        console.error('[createUserProfile] Error creating profile:', createProfileError);
        throw createProfileError;
      }
      
      // The triggers will handle role-specific table insertions
      console.log('[createUserProfile] Profile created with role:', role);
      
      // Verify the profile was created and get the role
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .select('role, user_id')
        .eq('id', userId)
        .single();
        
      if (newProfileError) {
        console.error('[createUserProfile] Error verifying profile:', newProfileError);
        throw newProfileError;
      }
      
      if (!newProfile) {
        console.error('[createUserProfile] Profile not found after creation');
        throw new Error('Profile not found after creation');
      }
      
      console.log('[createUserProfile] Verified profile:', {
        role: newProfile.role,
        user_id: newProfile.user_id
      });
      
      return newProfile.role;
      
    } catch (error) {
      console.error('[createUserProfile] Error creating profile:', error);
      throw error;
    }
  };

  const fetchUserRole = async (userId: string): Promise<string | null> => {
    console.log('[fetchUserRole] Starting for user ID:', userId);
    
    // First check if we have a cached role
    const cachedRole = getCachedRole(userId);
    if (cachedRole) {
      console.log('[fetchUserRole] Using cached role:', cachedRole);
      setUserRole(cachedRole);
      return cachedRole;
    }
    
    try {
      // Log current auth state before query
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[fetchUserRole] Current auth session:', {
        isAuthenticated: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });

      // Query the profiles table directly with the user's ID
      console.log('[fetchUserRole] Querying profiles table for id:', userId);
      const result = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)  // Using id directly as it matches auth.uid()
        .single();
      
      // Log the complete response for debugging
      console.log('[fetchUserRole] Supabase response:', {
        data: result.data,
        error: result.error,
        status: result.status,
        statusText: result.statusText
      });

      if (result.error) {
        console.error('[fetchUserRole] Supabase error:', {
          message: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint
        });
        throw result.error;
      }
      
      if (!result.data) {
        console.error('[fetchUserRole] No profile found for id:', userId);
        throw new Error('No profile found');
      }
      
      if (!result.data.role) {
        console.error('[fetchUserRole] Profile exists but has no role:', result.data);
        throw new Error('Profile exists but has no role');
      }
      
      console.log('[fetchUserRole] Found role:', result.data.role);
      
      setUserRole(result.data.role);
      setCachedRole(userId, result.data.role);
      
      return result.data.role;
      
    } catch (error) {
      console.error('[fetchUserRole] Error:', error);
      if (error instanceof Error) {
        console.error('[fetchUserRole] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }

      // Log current auth state after error
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[fetchUserRole] Current auth session after error:', {
        isAuthenticated: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });

      throw error;
    }
  };

  // Use this function instead of navigate for redirects
  const navigateTo = (path: string) => {
    const currentPath = getPathname();
    if (currentPath !== path) {
      console.log(`[navigateTo] Navigating from ${currentPath} to ${path}`);
      window.location.href = path;
    } else {
      console.log(`[navigateTo] Already on target path: ${path}, not navigating`);
    }
  };

  // Separate function to handle auth state changes
  const handleAuthStateChange = async (userId: string) => {
    console.log('[handleAuthStateChange] Starting for user ID:', userId);
    
    // Check if this is a public page that doesn't require authentication
    const currentPath = getPathname();
    const isPublicPage = currentPath === '/' || 
                         currentPath === '/login' ||
                         currentPath.startsWith('/public');
    
    // Check if a refresh is needed based on cooldown
    const now = Date.now();
    if (now - lastTokenRefreshTime < TOKEN_REFRESH_COOLDOWN) {
      console.log('[handleAuthStateChange] Skipping too frequent refresh');
      return;
    }
    
    // Set the last refresh time
    lastTokenRefreshTime = now;
    
    // First try to get user role from cache
    const cachedRole = getCachedRole(userId);
    if (cachedRole) {
      console.log('[handleAuthStateChange] Using cached role:', cachedRole);
      setUserRole(cachedRole);
      return;
    }
    
    try {
      // Use the enhanced getSession function to handle network issues better
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.user) {
        console.log('[handleAuthStateChange] No active session found');
        
        // For public pages, this is expected - don't treat as an error
        if (isPublicPage) {
          console.log('[handleAuthStateChange] On public page, no auth required');
          setIsLoading(false);
          return;
        } else {
          console.warn('[handleAuthStateChange] Session not found but required for this page');
          // Don't throw an error, just update auth state accordingly
          setUser(null);
          setUserRole(null);
          setIsLoading(false);
          
          // For non-public pages with no session, redirect to login
          if (!isPublicPage) {
            console.log('[handleAuthStateChange] Redirecting to login page');
            window.location.href = '/';
          }
          return;
        }
      }
      
      // Get the role from the database
      const role = await fetchUserRole(userId);
      
      if (!role) {
        console.warn('[handleAuthStateChange] No role found, trying to create profile');
        
        // Try to create a profile if none exists
        const userData = { user: sessionData.session.user };
        const newRole = await createUserProfile(userData);
        
        if (newRole) {
          console.log('[handleAuthStateChange] New profile created with role:', newRole);
          setUserRole(newRole);
          setCachedRole(userId, newRole);
        } else {
          console.error('[handleAuthStateChange] Failed to create profile and determine role');
          setUserRole('unknown');
        }
      } else {
        // Set authenticated status and user data
        setUser(sessionData.session.user);
        setUserRole(role);
      }
    } catch (error) {
      console.error('[handleAuthStateChange] Error handling auth state change:', error);
      const userRoleCache = localStorage.getItem(USER_ROLE_CACHE_KEY);
      
      // Try to recover from localStorage if we have previous data
      const cachedUserId = localStorage.getItem('user_id');
      
      if (cachedUserId && userRoleCache) {
        try {
          const parsedCache = JSON.parse(userRoleCache);
          if (parsedCache[cachedUserId]) {
            console.warn('[handleAuthStateChange] Using cached role as fallback:', parsedCache[cachedUserId]);
            setUserRole(parsedCache[cachedUserId]);
            // isAuthenticated will be computed based on user and userRole
          } else {
            // No cached role found
            setUser(null);
            setUserRole(null);
          }
        } catch (cacheError) {
          console.error('[handleAuthStateChange] Error parsing cache:', cacheError);
          setUser(null);
          setUserRole(null);
        }
      } else {
        // No cached data at all
        setUser(null);
        setUserRole(null);
        
        // For non-public pages with auth errors, redirect to login
        if (!isPublicPage) {
          console.log('[handleAuthStateChange] Auth error on protected page, redirecting to login');
          window.location.href = '/';
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to navigate user to appropriate dashboard
  const navigateUserToDashboard = (userId: string, role: string) => {
    console.log(`[navigateUserToDashboard] Navigating user ${userId} with role ${role}`);
    
    // Get the current path to avoid navigation loops
    const currentPath = getPathname();
    
    // Skip redirection for specific paths that should be accessible
    if (currentPath.includes('/lawyer/ai/') || 
        currentPath.includes('/lawyer/documents/') ||
        currentPath.includes('/lawyer/clients/') ||
        currentPath.includes('/lawyer/maintenance')) {
      console.log(`[navigateUserToDashboard] Skipping redirection for protected path: ${currentPath}`);
      return;
    }
    
    try {
      let targetPath = '';
      
      if (role === 'lawyer') {
        targetPath = `/lawyer/dashboard/${userId}`;
      } else if (role === 'admin') {
        targetPath = '/admin/dashboard';
      } else if (role === 'client') {
        targetPath = '/client/dashboard';
      } else {
        console.error('[navigateUserToDashboard] Unknown role:', role);
        targetPath = '/';
      }
      
      // Only navigate if we're not already on the target path
      if (currentPath !== targetPath) {
        console.log(`[navigateUserToDashboard] Navigating from ${currentPath} to ${targetPath}`);
        window.location.replace(targetPath);
      } else {
        console.log(`[navigateUserToDashboard] Already on target path: ${targetPath}, not navigating`);
      }
    } catch (error) {
      console.error('[navigateUserToDashboard] Navigation error:', error);
    }
  };

  // Helper function to handle auth retry
  const retryAuth = async (operation: () => Promise<any>) => {
    let lastError;
    for (let attempt = 0; attempt < AUTH_RETRY_ATTEMPTS; attempt++) {
      try {
        setIsRetrying(true);
        setAuthRetryCount(attempt);
        
        // Add timeout to the operation
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth operation timed out')), AUTH_CHECK_TIMEOUT)
          )
        ]);
        
        setIsRetrying(false);
        setAuthRetryCount(0);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Auth retry attempt ${attempt + 1} failed:`, error);
        
        if (attempt < AUTH_RETRY_ATTEMPTS - 1) {
          await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_DELAY * Math.pow(2, attempt)));
        }
      }
    }
    
    setIsRetrying(false);
    throw lastError;
  };

  // Modify the auth state check to use retry logic and improve session persistence
  useEffect(() => {
    // Check if a quick action is in progress first - if so, don't reset auth
    const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    if (isQuickActionInProgress) {
      console.log('[AuthContext] Quick action in progress - preserving existing auth state');
      return; // Skip the entire effect to avoid disrupting the quick action
    }
    
    console.log('[AuthContext] Setting up auth state listener');
    setIsLoading(true);
    
    const checkSession = async () => {
      // Skip if we are already checking the session to prevent duplicative API calls
      if (isSessionCheckInProgress) {
        console.log('[checkSession] Session check already in progress, skipping');
        return;
      }
      
      // Set the flag to indicate we're in progress
      isSessionCheckInProgress = true;
      
      // Check if we've checked recently - don't check more than once per second
      const now = Date.now();
      const lastCheck = lastAuthCheckRef.current;
      if (lastCheck && now - lastCheck < 1000) {
        console.log(`[checkSession] Session check too frequent, skipping (last check ${now - lastCheck}ms ago)`);
        isSessionCheckInProgress = false;
        setIsLoading(false); // Ensure we're not stuck in loading state
        return;
      }
      
      // Update the last check timestamp
      lastAuthCheckRef.current = now;
      
      // Check if a quick action is in progress first - if so, don't reset auth
      const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
      if (quickActionInProgress) {
        console.log('[checkSession] Quick action in progress - preserving existing auth state');
        // Don't set isLoading to false yet - maintain existing auth state
        // But do finish the in-progress flag
        isSessionCheckInProgress = false;
        setIsLoading(false); // Ensure we're not stuck in loading state
        return;
      }

      try {
        // Set loading state for initial auth check
        if (!user && isLoading === false) {
          setIsLoading(true);
        }

        // First try localStorage method for session recovery
        const storedSession = localStorage.getItem('ai_law_auth_token');
        const lastAuthState = localStorage.getItem('last_auth_state');
        const lastAuthTime = localStorage.getItem('last_auth_time');
        
        // If we have evidence of a recent authentication but the session might be in flux
        if (lastAuthState === 'authenticated' && lastAuthTime && (now - parseInt(lastAuthTime, 10)) < 60000) {
          console.log('[checkSession] Recent authentication detected, waiting for session stability');
          // Don't aggressively log out if we just logged in
        }

        // Use the enhanced getSession function
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('[checkSession] Session found, user is authenticated:', {
            userId: session.user.id,
            email: session.user.email,
          });
          
          // Store session status in localStorage to help with network issues
          try {
            localStorage.setItem('last_auth_state', 'authenticated');
            localStorage.setItem('last_auth_time', now.toString());
            localStorage.setItem('user_id', session.user.id);
          } catch (storageError) {
            console.warn('[checkSession] Failed to store auth state in localStorage:', storageError);
          }
          
          // Only update state if it's actually changed to prevent re-renders
          if (!user || user.id !== session.user.id) {
            setUser(session.user);
            
            // Get their role if we don't have it yet
            if (!userRole) {
              await handleAuthStateChange(session.user.id);
            }
          }
        } else {
          console.log('[checkSession] No session found, user is not authenticated');
          
          // Check if we have a recent authenticated state (might be network issue)
          const lastAuthState = localStorage.getItem('last_auth_state');
          const lastAuthTime = localStorage.getItem('last_auth_time');
          const cachedUserId = localStorage.getItem('user_id');
          
          if (
            lastAuthState === 'authenticated' && 
            lastAuthTime && 
            (now - parseInt(lastAuthTime, 10) < 60000) && // Within the last minute
            cachedUserId
          ) {
            console.warn('[checkSession] Recently authenticated but session missing, possible network issue');
            
            // CRITICAL FIX: Don't log out immediately if we recently authenticated
            // Instead, retry the session check after a delay
            setTimeout(() => {
              console.log('[checkSession] Retrying session check after recent authentication');
              checkSession();
            }, 1000);
            
            isSessionCheckInProgress = false;
            return;
          } else {
            // Clear state only if we're confident the user is truly logged out
            if (user !== null) {
              setUser(null);
            }
            
            if (userRole !== null) {
              setUserRole(null);
            }
            
            // Update localStorage state
            try {
              localStorage.setItem('last_auth_state', 'unauthenticated');
              localStorage.setItem('last_auth_time', now.toString());
              localStorage.removeItem('user_id');
            } catch (storageError) {
              console.warn('[checkSession] Failed to update auth state in localStorage:', storageError);
            }
          }
        }
      } catch (sessionError) {
        console.error('[checkSession] Error retrieving session:', sessionError);
        
        // Try to recover from localStorage if there's a session error
        recoverFromLocalStorage();
      } finally {
        // CRITICAL: Ensure loading state is always turned off after the session check
        isSessionCheckInProgress = false;
        setIsLoading(false);
        console.log('[checkSession] Session check complete, isLoading set to false');
      }
    };
    
    // Helper function to recover from localStorage
    const recoverFromLocalStorage = () => {
      try {
        const cachedUserId = localStorage.getItem('user_id');
        const lastAuthState = localStorage.getItem('last_auth_state');
        const lastAuthTime = localStorage.getItem('last_auth_time');
        const now = Date.now();
        
        if (
          cachedUserId && 
          lastAuthState === 'authenticated' && 
          lastAuthTime && 
          (now - parseInt(lastAuthTime, 10) < 3600000) // Within the last hour
        ) {
          console.warn('[checkSession] Network error, using cached auth data for temporary access');
          
          // Don't clear existing user state during network errors
          
          // If we don't have a user or role yet, try to use cached role
          if (!userRole && cachedUserId) {
            const cachedRole = getCachedRole(cachedUserId);
            if (cachedRole) {
              console.warn('[checkSession] Using cached role for offline mode:', cachedRole);
              setUserRole(cachedRole);
            }
          }
        }
      } catch (cacheError) {
        console.error('[checkSession] Cache recovery failed:', cacheError);
      }
    };
    
    // Run initial session check
    checkSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        
        // Skip TOKEN_REFRESHED events that happen when tab gains focus
        if (event === 'TOKEN_REFRESHED') {
          // Only process important token refreshes, skip routine ones
          const now = Date.now();
          if (now - lastTokenRefreshTime < TOKEN_REFRESH_COOLDOWN) {
            console.log('[AuthContext] Skipping routine token refresh event');
            lastTokenRefreshTime = now;
            return;
          }
          
          // Update the last refresh time
          lastTokenRefreshTime = now;
          
          // For TOKEN_REFRESHED, just update the user object but do not trigger navigation
          if (session?.user) {
            setUser(session.user);
          }
          return;
        }
        
        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] User signed in:', session);
          
          try {
            // Skip if we're already processing an auth state change
            if (pendingAuthStateChange) {
              console.log('[AuthContext] Ignoring auth event while another is in progress');
              return;
            }
            
            // Check if we're in an AI Lawyer page
            const currentPath = getPathname();
            const isInAILawyerPage = currentPath.includes('/lawyer/ai/');
            
            // Check if we have an active chat
            const hasActiveChat = sessionStorage.getItem('ACTIVE_CHAT_SESSION') === 'true';
            const preservingChatState = sessionStorage.getItem('PRESERVE_CHAT_STATE') === 'true';
            const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
            const skipNextAuthChange = sessionStorage.getItem('SKIP_NEXT_AUTH_CHANGE') === 'true';
            
            // Check if this SIGNED_IN event happened right after a tab visibility change
            const tabVisibleTimestamp = sessionStorage.getItem('AUTH_TAB_VISIBLE_TIMESTAMP');
            const tabVisibleTime = tabVisibleTimestamp ? parseInt(tabVisibleTimestamp, 10) : 0;
            const now = Date.now();
            
            // If we have a quick action in progress, definitely skip auth changes
            if (isQuickActionInProgress) {
              console.log('[AuthContext] Skipping auth change - quick action is in progress');
              lastTokenRefreshTime = now;
              return;
            }
            
            // If we were explicitly told to skip the next auth change (tab visibility event set this flag)
            if (skipNextAuthChange) {
              console.log('[AuthContext] Skipping auth change - SKIP_NEXT_AUTH_CHANGE flag is set');
              sessionStorage.removeItem('SKIP_NEXT_AUTH_CHANGE'); // Clear the flag
              lastTokenRefreshTime = now;
              return;
            }
            
            // If we're in an AI Lawyer page, have an active chat, or the SIGNED_IN event happened within 2 seconds of tab becoming visible,
            // and the user object already exists with the same ID, this is likely just
            // a refresh after tab switch, so we can skip the full auth change process
            if ((isInAILawyerPage || 
                 hasActiveChat ||
                 preservingChatState ||
                 (tabVisibleTime > 0 && (now - tabVisibleTime < 2000))) && 
                user && 
                user.id === session.user.id) {
              console.log('[AuthContext] Skipping auth change - in AI page, has active chat, or likely due to tab visibility change');
              // Just update the timestamp but don't process the full auth change
              lastTokenRefreshTime = now;
              return;
            }
            
            pendingAuthStateChange = true;
            
            await retryAuth(async () => {
              console.log('[AuthContext] Setting user from auth event:', session.user.id);
              
              // Update localStorage state for recovery
              try {
                localStorage.setItem('last_auth_state', 'authenticated');
                localStorage.setItem('last_auth_time', Date.now().toString());
                localStorage.setItem('user_id', session.user.id);
              } catch (storageError) {
                console.warn('[AuthContext] Failed to store auth state in localStorage:', storageError);
              }
              
              // Check if the user ID is the same to avoid unnecessary updates
              if (!user || user.id !== session.user.id) {
                setUser(session.user);
                await handleAuthStateChange(session.user.id);
              } else {
                console.log('[AuthContext] User ID unchanged, skipping state update');
              }
            });
          } catch (error) {
            console.error('[AuthContext] Error handling sign in:', error);
            // Show error toast or handle error appropriately
          } finally {
            pendingAuthStateChange = false;
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out, clearing state');
          
          // Update localStorage state
          try {
            localStorage.setItem('last_auth_state', 'unauthenticated');
            localStorage.setItem('last_auth_time', Date.now().toString());
            localStorage.removeItem('user_id');
          } catch (storageError) {
            console.warn('[AuthContext] Failed to update auth state in localStorage:', storageError);
          }
          
          setUser(null);
          setUserRole(null);
        }
      }
    );
    
    // Track tab visibility changes to detect potential token refreshes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Store the timestamp without triggering a token refresh
        const timestamp = Date.now();
        
        // Check if we're in the middle of a conversation to avoid disrupting the chat
        const currentPath = getPathname();
        const isInAILawyerPage = currentPath.includes('/lawyer/ai/');
        
        // Check if we have an active chat (additional check)
        const hasActiveChat = sessionStorage.getItem('ACTIVE_CHAT_SESSION') === 'true';
        const preservingChatState = sessionStorage.getItem('PRESERVE_CHAT_STATE') === 'true';
        const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
        
        // If a quick action is in progress, we should definitely skip any auth changes
        if (isQuickActionInProgress) {
          console.log('[AuthContext] Tab became visible while a quick action is in progress, skipping token refresh');
          
          // Set a flag to prevent auth changes during the next EVENT_SIGNED_IN event
          sessionStorage.setItem('SKIP_NEXT_AUTH_CHANGE', 'true');
          
          // Extra safety measure - ensure these flags are present
          sessionStorage.setItem('ACTIVE_CHAT_SESSION', 'true');
          sessionStorage.setItem('PRESERVE_CHAT_STATE', 'true');
          
          return; // Exit early - don't update any timestamps
        }
        
        // Only record the timestamp if we're not in an active conversation
        // This prevents chat refreshes when switching back to a tab with an active chat
        if (!isInAILawyerPage && !hasActiveChat && !preservingChatState) {
          // Use a separate key to track visibility changes
          sessionStorage.setItem('AUTH_TAB_VISIBLE_TIMESTAMP', timestamp.toString());
          console.log('[AuthContext] Tab became visible, preparing for potential token refresh');
          
          // But do not force a token refresh or session check here!
          // Just update the timestamp for debouncing purposes
          lastTokenRefreshTime = timestamp;
        } else {
          console.log('[AuthContext] Tab became visible in AI page or has active chat, skipping token refresh preparation');
          
          // Set a flag to potentially skip the next auth change if it's very close to this visibility change
          // This helps with the common "SIGNED_IN after tab switch" scenario that disrupts chats
          sessionStorage.setItem('SKIP_NEXT_AUTH_CHANGE', 'true');
          
          // Remove this flag after a short delay (it's only for immediate auth events)
          setTimeout(() => {
            sessionStorage.removeItem('SKIP_NEXT_AUTH_CHANGE');
          }, 2000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up function
    return () => {
      // Check for quick action before cleanup
      const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
      const preservingChatState = sessionStorage.getItem('PRESERVE_CHAT_STATE') === 'true';
      
      if (quickActionInProgress) {
        console.log('[AuthContext] Skipping auth cleanup due to quick action in progress');
        // Ensure we preserve the auth state in session storage to survive page reloads
        try {
          if (user) {
            // Don't use localStorage for sensitive data - just for flags
            sessionStorage.setItem('PRESERVED_AUTH_STATE', 'true');
          }
        } catch (err) {
          console.error('[AuthContext] Error preserving auth state:', err);
        }
        return; // Skip cleanup to preserve state
      }
      
      // Don't clean up auth state during chat preservation either
      if (preservingChatState) {
        console.log('[AuthContext] Skipping auth cleanup due to chat state preservation');
        return;
      }
      
      console.log('[AuthContext] Cleaning up auth listener');
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, userRole, isAuthenticated]); // Add isAuthenticated as a dependency

  // Add loading indicator if retrying
  if (isLoading && isRetrying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Connecting to auth service{authRetryCount > 0 ? ` (Attempt ${authRetryCount + 1}/${AUTH_RETRY_ATTEMPTS})` : ''}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

