import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, ThemeVariant, themeModes, themeVariants } from './themes';
import { applyTheme } from './themeUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ThemeContextType {
  mode: ThemeMode;
  variant: ThemeVariant;
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggleMode: () => void;
  isSystemWide: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use theme context - defined before ThemeProvider
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Utility hook for theme-aware styles
function useThemeAwareStyle(lightStyles: React.CSSProperties, darkStyles: React.CSSProperties) {
  const { mode } = useTheme();
  return mode === 'light' ? lightStyles : darkStyles;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultVariant?: ThemeVariant;
  applyTheme?: boolean;
}

function ThemeProvider({
  children,
  defaultMode = 'dark',
  defaultVariant = 'blue',
  applyTheme: shouldApplyTheme = true
}: ThemeProviderProps) {
  // Ensure default values are valid
  const safeDefaultMode = themeModes.includes(defaultMode) ? defaultMode : 'light';
  const safeDefaultVariant = themeVariants.includes(defaultVariant) ? defaultVariant : 'default';
  
  const [mode, setMode] = useState<ThemeMode>(safeDefaultMode);
  const [variant, setVariant] = useState<ThemeVariant>(safeDefaultVariant);
  const [isSystemWide, setIsSystemWide] = useState<boolean>(false);
  const [initialThemeLoaded, setInitialThemeLoaded] = useState<boolean>(false);
  const auth = useAuth();
  const userRole = auth?.userRole;
  const isAdmin = userRole === 'admin';
  const isLoading = auth?.isLoading;

  // Load cached theme on mount, before any authentication checks
  useEffect(() => {
    // Skip if we're not supposed to apply themes
    if (!shouldApplyTheme) {
      setInitialThemeLoaded(true);
      return;
    }
    
    const loadCachedTheme = () => {
      try {
        // Check localStorage for cached theme to avoid flicker
        const cachedTheme = localStorage.getItem('theme_config');
        if (cachedTheme) {
          try {
            const parsedCache = JSON.parse(cachedTheme);
            // Apply cached theme immediately to avoid flash of unstyled content
            if (parsedCache.mode && themeModes.includes(parsedCache.mode)) {
              setMode(parsedCache.mode);
            }
            if (parsedCache.variant && themeVariants.includes(parsedCache.variant)) {
              setVariant(parsedCache.variant);
            }
            console.log('Applied cached theme:', {mode: parsedCache.mode, variant: parsedCache.variant});
            
            // Apply theme directly to avoid flickering
            if (shouldApplyTheme) {
              applyTheme(
                parsedCache.mode && themeModes.includes(parsedCache.mode) ? parsedCache.mode : safeDefaultMode,
                parsedCache.variant && themeVariants.includes(parsedCache.variant) ? parsedCache.variant : safeDefaultVariant
              );
            }
          } catch (parseError) {
            console.warn('Error parsing cached theme:', parseError);
            // Apply defaults if parsing fails
            if (shouldApplyTheme) {
              applyTheme(safeDefaultMode, safeDefaultVariant);
            }
          }
        } else {
          // No cached theme, just apply defaults
          if (shouldApplyTheme) {
            applyTheme(safeDefaultMode, safeDefaultVariant);
          }
        }
        setInitialThemeLoaded(true);
      } catch (error) {
        console.error('Error loading cached theme:', error);
        // Ensure we have a fallback theme
        if (shouldApplyTheme) {
          applyTheme(safeDefaultMode, safeDefaultVariant);
        }
        setInitialThemeLoaded(true);
      }
    };

    // Load cached theme immediately
    loadCachedTheme();
  }, [safeDefaultMode, safeDefaultVariant, shouldApplyTheme]);

  // Fetch system theme settings
  useEffect(() => {
    // Skip theme fetching if authentication is still loading
    // This prevents unnecessary network requests during auth state changes
    if (isLoading) {
      return;
    }

    const fetchSystemThemeSettings = async () => {
      // If we already loaded the initial theme, don't fetch immediately
      // This prevents flickering during auth changes
      if (!initialThemeLoaded) {
        return;
      }
      
      try {
        // Try to get system-wide theme settings from Supabase
        // Use a timeout to prevent hanging
        const fetchPromise = supabase
          .from('system_config')
          .select('*')
          .eq('id', 'theme')
          .single();
          
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Theme fetch timed out')), 5000)
        );
        
        try {
          // Use a type assertion for the race result to match Supabase's response type
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          const { data, error } = result as { data: any, error: any };

          if (error) {
            if (error.code === 'PGRST116') {
              // Record not found, create default theme settings if admin
              if (isAdmin) {
                try {
                  await supabase
                    .from('system_config')
                    .upsert({
                      id: 'theme',
                      theme_config: {
                        mode: safeDefaultMode,
                        variant: safeDefaultVariant,
                        sitewide: false
                      }
                    });
                  console.log('Created default theme settings');
                } catch (insertError) {
                  console.error('Error creating default theme settings:', insertError);
                }
              }
            } else {
              console.warn('Error fetching system theme settings (non-critical):', error);
            }
            return;
          }

          if (data && data.theme_config) {
            const systemTheme = data.theme_config;
            setIsSystemWide(systemTheme.sitewide || false);
            
            // Cache the fetched theme
            try {
              localStorage.setItem('theme_config', JSON.stringify(systemTheme));
              localStorage.setItem('theme_config_timestamp', Date.now().toString());
            } catch (cacheError) {
              console.warn('Error caching theme:', cacheError);
            }
            
            // Apply system theme if it's sitewide and user is not admin
            if (systemTheme.sitewide && !isAdmin) {
              if (systemTheme.mode && themeModes.includes(systemTheme.mode)) {
                setMode(systemTheme.mode);
              }
              
              if (systemTheme.variant && themeVariants.includes(systemTheme.variant)) {
                setVariant(systemTheme.variant);
              }
            }
          }
        } catch (networkError) {
          // Handle network errors gracefully
          console.warn('Network error fetching system theme settings (non-critical):', networkError);
          // Continue using cached or default theme
        }
      } catch (error) {
        console.error('Error in theme settings initialization:', error);
        // We already applied fallback theme in the first useEffect
      }
    };

    fetchSystemThemeSettings();
  }, [isAdmin, safeDefaultMode, safeDefaultVariant, isLoading, initialThemeLoaded]);

  // Load user theme preferences from localStorage on mount (only for admins or if not system-wide)
  useEffect(() => {
    if (!initialThemeLoaded) return;
    
    try {
      // Only load user preferences if admin or not system-wide
      if (isAdmin || !isSystemWide) {
        const storedMode = localStorage.getItem('theme-mode') as ThemeMode;
        const storedVariant = localStorage.getItem('theme-variant') as ThemeVariant;

        // Validate stored values
        if (storedMode && themeModes.includes(storedMode)) {
          setMode(storedMode);
        }
        
        if (storedVariant && themeVariants.includes(storedVariant)) {
          setVariant(storedVariant);
        }
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    }
  }, [isAdmin, isSystemWide, initialThemeLoaded]);

  // Update localStorage and document attributes when theme changes
  useEffect(() => {
    try {
      // Only save to localStorage if admin or not system-wide
      if (isAdmin || !isSystemWide) {
        localStorage.setItem('theme-mode', mode);
        localStorage.setItem('theme-variant', variant);
      }
      
      // Apply theme directly using the utility function - only if we should apply
      if (shouldApplyTheme) {
        applyTheme(mode, variant);
      }
      
    } catch (error) {
      console.error('Error applying theme:', error);
      // Fallback to default theme if there's an error
      if (shouldApplyTheme) {
        applyTheme('light', 'default');
      }
    }
  }, [mode, variant, isAdmin, isSystemWide, shouldApplyTheme]);

  // Only allow toggling mode if admin or not system-wide
  const toggleMode = () => {
    if (isAdmin || !isSystemWide) {
      setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
    }
  };

  // Create wrapper functions for setMode and setVariant to ensure immediate updates
  const handleSetMode = (newMode: ThemeMode) => {
    if (isAdmin || !isSystemWide) {
      setMode(newMode);
      // Force immediate update
      if (shouldApplyTheme) {
        applyTheme(newMode, variant);
      }
    }
  };

  const handleSetVariant = (newVariant: ThemeVariant) => {
    if (isAdmin || !isSystemWide) {
      setVariant(newVariant);
      // Force immediate update
      if (shouldApplyTheme) {
        applyTheme(mode, newVariant);
      }
    }
  };

  const value = {
    mode,
    variant,
    setMode: handleSetMode,
    setVariant: handleSetVariant,
    toggleMode,
    isSystemWide
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Export the components and hooks
export { ThemeProvider, useTheme, useThemeAwareStyle }; 