import { supabase } from '@/integrations/supabase/client';

export interface ThemeConfig {
  lawyerTheme: string;
  adminTheme: string;
  updatedAt: string;
  sitewide?: boolean;
  mode?: string;
  variant?: string;
}

const CACHE_KEY = 'theme_config';
const CACHE_TIMESTAMP_KEY = 'theme_config_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CONFIG: ThemeConfig = {
  lawyerTheme: 'winter',
  adminTheme: 'dark',
  updatedAt: new Date().toISOString()
};

// Map variant names to actual theme names
const VARIANT_TO_THEME_MAP: Record<string, string> = {
  'premium': 'dark', // Map 'premium' variant to 'dark' theme
  'default': 'winter',
  'light': 'winter',
  'dark': 'dark',
  'winter': 'winter',
  'summer': 'summer',
  'autumn': 'autumn',
  'spring': 'spring'
};

class ThemeService {
  private async updateCache(config: ThemeConfig): Promise<void> {
    try {
      // Validate config before storing
      if (!config) {
        console.warn('Attempted to cache invalid theme config:', config);
        return;
      }
      
      // Check if we have storage access before attempting to write
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available, skipping theme cache update');
        return;
      }
      
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(config));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.debug('Theme config cached successfully');
      } catch (storageError) {
        // This can happen in private browsing mode or when storage is full
        console.warn('Could not write theme to localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error updating theme cache:', error);
      // Fail silently - this is just caching
    }
  }

  private getThemeStyles(theme: string): Record<string, string> {
    const themeStyles: Record<string, Record<string, string>> = {
      winter: {
        '--background': '220 33% 98%',
        '--foreground': '224 71.4% 4.1%',
        '--card': '0 0% 100%',
        '--card-foreground': '224 71.4% 4.1%',
        '--popover': '0 0% 100%',
        '--popover-foreground': '224 71.4% 4.1%',
        '--primary': '221.2 83.2% 53.3%',
        '--primary-foreground': '210 40% 98%',
        '--secondary': '210 40% 96.1%',
        '--secondary-foreground': '222.2 47.4% 11.2%',
        '--muted': '220 14.3% 95.9%',
        '--muted-foreground': '220 8.9% 46.1%',
        '--accent': '262.1 83.3% 57.8%',
        '--accent-foreground': '210 40% 98%',
        '--destructive': '0 84.2% 60.2%',
        '--destructive-foreground': '210 40% 98%',
        '--border': '220 13% 91%',
        '--input': '220 13% 91%',
        '--ring': '224 71.4% 4.1%',
        '--radius': '0.5rem'
      },
      summer: {
        '--primary': '47.9 95.8% 53.1%',
        '--background': '40 33% 98%',
        '--glass-bg': 'rgba(255, 255, 255, 0.85)',
        '--page-background': 'linear-gradient(to bottom, #fff8e1, #ffecb3)'
      },
      autumn: {
        '--primary': '24.6 95% 53.1%',
        '--background': '30 33% 98%',
        '--glass-bg': 'rgba(255, 255, 255, 0.85)',
        '--page-background': 'linear-gradient(to bottom, #ffebee, #ffcdd2)'
      },
      spring: {
        '--primary': '142.1 70.6% 45.3%',
        '--background': '150 33% 98%',
        '--glass-bg': 'rgba(255, 255, 255, 0.85)',
        '--page-background': 'linear-gradient(to bottom, #e8f5e9, #c8e6c9)'
      },
      light: {
        '--primary': '221.2 83.2% 53.3%',
        '--background': '0 0% 100%',
        '--glass-bg': 'rgba(255, 255, 255, 0.85)',
        '--page-background': 'linear-gradient(to bottom, #ffffff, #f5f5f5)'
      },
      dark: {
        '--background': '224 71.4% 4.1%',
        '--foreground': '210 20% 98%',
        '--card': '224 71.4% 4.1%',
        '--card-foreground': '210 20% 98%',
        '--popover': '224 71.4% 4.1%',
        '--popover-foreground': '210 20% 98%',
        '--primary': '217.2 91.2% 59.8%',
        '--primary-foreground': '222.2 47.4% 11.2%',
        '--secondary': '217.2 32.6% 17.5%',
        '--secondary-foreground': '210 40% 98%',
        '--muted': '217.2 32.6% 17.5%',
        '--muted-foreground': '215 20.2% 65.1%',
        '--accent': '262.1 83.3% 57.8%',
        '--accent-foreground': '210 40% 98%',
        '--destructive': '0 62.8% 30.6%',
        '--destructive-foreground': '210 40% 98%',
        '--border': '217.2 32.6% 17.5%',
        '--input': '217.2 32.6% 17.5%',
        '--ring': '212.7 26.8% 83.9%',
        '--radius': '0.5rem'
      }
    };

    return themeStyles[theme] || themeStyles.winter;
  }

  private getGlobalStyles(theme: string): string {
    return `
      :root {
        color-scheme: ${theme === 'dark' ? 'dark' : 'light'};
      }

      body {
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
      }

      .glass-card {
        background-color: hsl(var(--card) / 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid hsl(var(--border) / 0.2);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      }

      .hover-card {
        transition: all 0.3s ease;
      }

      .hover-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      }
    `;
  }

  private cleanupThemeStyles(): void {
    const existingStyle = document.getElementById('theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const cssVars = [
      '--primary',
      '--background',
      '--glass-bg',
      '--glass-border',
      '--glass-shadow',
      '--glass-backdrop',
      '--page-background'
    ];

    cssVars.forEach(variable => {
      document.documentElement.style.removeProperty(variable);
    });
  }

  private applyThemeStyles(theme: string, target: Element): void {
    // Clean up existing styles first
    this.cleanupThemeStyles();

    // Apply new theme styles
    const styles = this.getThemeStyles(theme);
    Object.entries(styles).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });

    // Create and apply global styles
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-styles';
    styleElement.textContent = this.getGlobalStyles(theme);
    document.head.appendChild(styleElement);

    // Force a repaint to ensure styles are applied
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force reflow
    document.body.style.display = '';

    // Add theme class to document
    document.documentElement.className = theme;
  }

  async getCurrentTheme(): Promise<ThemeConfig> {
    try {
      // First check if we have a valid cached config
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }

      // Check if we have an authenticated session - wrap in try/catch for network errors
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, return default or cached config
          console.info('Theme: No active session, using cached or default theme');
          return cached ? JSON.parse(cached) : DEFAULT_CONFIG;
        }

        // Try to fetch from Supabase if authenticated
        try {
          const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .eq('id', 'theme')
            .single();

          if (error) {
            console.warn('Error fetching theme from system_config:', error);
            // Return cached or default if there's an error
            return cached ? JSON.parse(cached) : DEFAULT_CONFIG;
          }

          // Handle the specific format from the database
          // Data format from DB: {"mode": "dark", "variant": "premium", "sitewide": true}
          const dbConfig = data?.theme_config || {};
          
          // Create our application's expected format
          let config: ThemeConfig = {
            ...DEFAULT_CONFIG,
            updatedAt: new Date().toISOString()
          };
          
          // Map the variant to an actual theme name
          const themeVariant = dbConfig.variant ? 
            VARIANT_TO_THEME_MAP[dbConfig.variant] || 'winter' : 
            (dbConfig.mode === 'dark' ? 'dark' : 'winter');
          
          // Check if the theme is set to be system-wide
          if (dbConfig.sitewide === true) {
            console.info('System-wide theme detected. All users will use the system theme.');
            config.sitewide = true;
            config.mode = dbConfig.mode;
            config.variant = dbConfig.variant;
            
            // Use the same theme for both admin and lawyer when system-wide is enabled
            config.lawyerTheme = themeVariant;
            config.adminTheme = themeVariant;
          } else {
            // If not system-wide, use separate themes
            // Default to mode-based theme if no specific variant provided
            if (dbConfig.mode === 'dark') {
              config.adminTheme = 'dark';
              config.lawyerTheme = 'dark';
            } else {
              config.adminTheme = 'winter';
              config.lawyerTheme = 'winter';
            }
            
            // But if we have specific variant, use that
            if (dbConfig.variant) {
              config.adminTheme = themeVariant;
              config.lawyerTheme = themeVariant;
            }
          }
          
          console.log('Processed theme config:', config);
          
          await this.updateCache(config);
          return config;
        } catch (fetchError) {
          console.warn('Network error fetching theme from system_config:', fetchError);
          return cached ? JSON.parse(cached) : DEFAULT_CONFIG;
        }
      } catch (sessionError) {
        console.warn('Network error getting session for theme:', sessionError);
        return cached ? JSON.parse(cached) : DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error('Error getting current theme:', error);
      // If something unexpectedly fails, use cached or default
      try {
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        // Ignore parse errors
      }
      return DEFAULT_CONFIG;
    }
  }

  async initializeThemeConfig(config: ThemeConfig): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          id: 'theme',
          theme_config: config
        });

      if (error) throw error;
      await this.updateCache(config);
    } catch (error) {
      console.error('Error initializing theme config:', error);
      throw new Error('Failed to initialize theme configuration');
    }
  }

  async updateTheme(theme: string, userType: 'admin' | 'lawyer'): Promise<void> {
    try {
      // Get current config - avoids race conditions where only part of config is updated
      const currentConfig = await this.getCurrentTheme();
      
      // Create updated config
      const updatedConfig: ThemeConfig = {
        ...currentConfig,
        updatedAt: new Date().toISOString()
      };
      
      // Update the appropriate theme based on user type
      if (userType === 'admin') {
        updatedConfig.adminTheme = theme;
      } else {
        updatedConfig.lawyerTheme = theme;
      }
      
      // If sitewide theme is enabled, update the flags
      if (updatedConfig.sitewide === true) {
        // Determine which theme to use globally
        const globalTheme = updatedConfig.variant ? 
          VARIANT_TO_THEME_MAP[updatedConfig.variant] || 'winter' : 
          (updatedConfig.mode === 'dark' ? 'dark' : 'winter');
        
        // Update the localStorage flags for sitewide theme
        localStorage.setItem('sitewide_theme_active', 'true');
        localStorage.setItem('current_sitewide_theme', globalTheme);
        
        // Apply the theme immediately
        this.applyTheme(globalTheme);
      } else {
        // If we're updating the theme for the current user type, apply it immediately
        const currentPath = window.location.pathname;
        const isAdminPath = currentPath.startsWith('/admin');
        
        if ((isAdminPath && userType === 'admin') || (!isAdminPath && userType === 'lawyer')) {
          this.applyTheme(theme);
        }
        
        // Remove any sitewide flags
        localStorage.removeItem('sitewide_theme_active');
        localStorage.removeItem('current_sitewide_theme');
      }
      
      // Update cache regardless
      this.updateCache(updatedConfig);
      
      // Save to database
      const { error } = await supabase
        .from('system_config')
        .update({
          theme_config: updatedConfig
        })
        .eq('id', 'theme');
      
      if (error) {
        throw error;
      }
      
      // Force reload theme on all pages to ensure consistency
      this.applyThemeForCurrentPath();
      
      console.log(`${userType} theme updated to ${theme}`);
    } catch (error) {
      console.error('Error updating theme:', error);
      // Try to apply the theme locally even if save fails
      try {
        if (userType === 'admin') {
          const isAdminPath = window.location.pathname.startsWith('/admin');
          if (isAdminPath) {
            this.applyTheme(theme);
          }
        } else {
          const isLawyerPath = window.location.pathname.includes('/lawyer') || 
                              window.location.pathname.includes('/clients');
          if (isLawyerPath) {
            this.applyTheme(theme);
          }
        }
      } catch (applyError) {
        console.error('Failed to apply theme locally after save error:', applyError);
      }
      
      throw error;
    }
  }

  /**
   * Updates theme settings for all users (admin-only function)
   * This gracefully handles the case where the RPC function doesn't exist
   */
  async updateAllUserThemes(themeMode: string, themeVariant: string): Promise<{success: boolean, message: string}> {
    try {
      console.log(`Updating all user themes to mode: ${themeMode}, variant: ${themeVariant}`);
      
      // Get current config
      const currentConfig = await this.getCurrentTheme();
      
      // Determine which theme to use based on variant and mode
      const actualTheme = themeVariant ? 
        VARIANT_TO_THEME_MAP[themeVariant] || 'winter' : 
        (themeMode === 'dark' ? 'dark' : 'winter');
      
      // Update the config with sitewide flag enabled
      const updatedConfig: ThemeConfig = {
        ...currentConfig,
        sitewide: true,
        mode: themeMode,
        variant: themeVariant,
        updatedAt: new Date().toISOString()
      };
      
      // Update local storage flags for sitewide theme
      localStorage.setItem('sitewide_theme_active', 'true');
      localStorage.setItem('current_sitewide_theme', actualTheme);
      
      // Apply the theme immediately to current page
      this.applyTheme(actualTheme);
      
      // Update cache
      this.updateCache(updatedConfig);
      
      // Save to database
      const { error } = await supabase
        .from('system_config')
        .update({
          theme_config: updatedConfig
        })
        .eq('id', 'theme');
      
      if (error) {
        console.error('Error updating system_config:', error);
        return {
          success: false, 
          message: 'Failed to save theme settings to database. Local changes were applied.'
        };
      }
      
      console.log('Successfully updated system-wide theme to:', {
        mode: themeMode,
        variant: themeVariant,
        actualTheme
      });
      
      // Try to call the RPC function for updating all user preferences if available
      try {
        const { error: rpcError } = await supabase.rpc('update_all_user_theme_settings', {
          theme_mode: themeMode,
          theme_variant: themeVariant
        });
        
        if (rpcError) {
          console.warn('RPC function error (update_all_user_theme_settings):', rpcError);
        }
      } catch (rpcError) {
        console.warn('Error calling RPC function:', rpcError);
        // Not critical, continue
      }
      
      return {
        success: true,
        message: 'Theme settings updated for all users'
      };
    } catch (error) {
      console.error('Error updating all user themes:', error);
      return {
        success: false,
        message: 'Failed to update theme settings'
      };
    }
  }

  subscribeToThemeChanges(callback: (config: ThemeConfig) => void): () => void {
    const channel = supabase.channel('theme-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'id=eq.theme'
        },
        (payload) => {
          if (payload.new && 'theme_config' in payload.new) {
            const config = payload.new.theme_config as ThemeConfig;
            this.updateCache(config);
            callback(config);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  previewTheme(theme: string): void {
    const previewSection = document.querySelector('[data-preview-section]');
    if (previewSection) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      previewSection.setAttribute('data-theme', theme);
      this.applyThemeStyles(theme, previewSection);
      
      if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
      }
    }
  }

  applyTheme(theme: string): void {
    try {
      // Validate theme input
      if (!theme) {
        console.warn('Invalid theme provided, falling back to winter');
        theme = 'winter'; // Default fallback
      }
      
      console.log(`Applying theme: ${theme} system-wide`);
      
      // Clean up existing styles first
      try {
        this.cleanupThemeStyles();
      } catch (cleanupError) {
        console.warn('Error cleaning up theme styles:', cleanupError);
        // Continue with applying new theme even if cleanup fails
      }

      // Apply new theme styles
      const styles = this.getThemeStyles(theme);
      if (!styles || Object.keys(styles).length === 0) {
        console.warn(`No styles found for theme "${theme}", falling back to winter`);
        theme = 'winter';
        // Try to get default theme styles
        const fallbackStyles = this.getThemeStyles(theme);
        if (!fallbackStyles) {
          throw new Error('Critical error: No fallback theme styles available');
        }
      }
      
      // Apply CSS variables to document root
      Object.entries(styles).forEach(([property, value]) => {
        try {
          document.documentElement.style.setProperty(property, value);
        } catch (propertyError) {
          console.warn(`Failed to set CSS property ${property}:`, propertyError);
        }
      });

      // SET DATA-THEME ATTRIBUTE - Critical for shadcn and other component libraries
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      
      // Create and apply global styles
      try {
        const styleElement = document.createElement('style');
        styleElement.id = 'theme-styles';
        styleElement.textContent = this.getGlobalStyles(theme);
        document.head.appendChild(styleElement);
      } catch (styleError) {
        console.warn('Error creating or applying theme style element:', styleError);
      }

      // Apply theme class to both HTML and body elements for maximum compatibility
      try {
        document.documentElement.className = theme;
        
        // Add theme class to body, but preserve existing classes
        const currentBodyClasses = document.body.className.split(' ').filter(c => 
          !['winter', 'dark', 'light', 'summer', 'autumn', 'spring'].includes(c)
        );
        currentBodyClasses.push(theme);
        document.body.className = currentBodyClasses.join(' ');
        
        // Also set data-mode for dark/light specific styling (used by some components)
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
        document.body.setAttribute('data-mode', isDark ? 'dark' : 'light');
      } catch (classError) {
        console.warn('Error setting document class:', classError);
      }
      
      // Force a repaint is least critical - try but don't block on errors
      try {
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
      } catch (repaintError) {
        console.debug('Non-critical error during style repaint:', repaintError);
      }
      
      console.log(`Theme "${theme}" successfully applied system-wide`);
    } catch (error) {
      console.error('Critical error applying theme:', error);
      // Last resort - attempt to reset to a known good state
      try {
        document.documentElement.removeAttribute('class');
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-mode');
        document.body.className = '';
        document.body.removeAttribute('data-theme');
        document.body.removeAttribute('data-mode');
        const existingStyle = document.getElementById('theme-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      } catch (resetError) {
        console.error('Failed to reset theme styles after error:', resetError);
      }
    }
  }

  async applyThemeForCurrentPath(): Promise<void> {
    try {
      console.log('Determining appropriate theme for current path...');
      // Get theme configuration with fallbacks
      let config: ThemeConfig;
      
      try {
        // First check if theme is system-wide
        config = await this.getCurrentTheme();
        
        // If system-wide is enabled, use the system theme for all pages
        if (config.sitewide === true) {
          // Map the variant to an actual theme
          const themeVariant = config.variant ? 
            VARIANT_TO_THEME_MAP[config.variant] || 'winter' : 
            (config.mode === 'dark' ? 'dark' : 'winter');
          
          console.log(`System-wide theme detected! Applying global theme: ${themeVariant}`);
          
          // Apply to ALL pages regardless of path
          this.applyTheme(themeVariant);
          
          // Force the data-theme attribute on the html and body elements for maximum compatibility
          document.documentElement.setAttribute('data-theme', themeVariant);
          document.body.setAttribute('data-theme', themeVariant);
          
          // Set a flag in localStorage to indicate sitewide theme is active
          localStorage.setItem('sitewide_theme_active', 'true');
          localStorage.setItem('current_sitewide_theme', themeVariant);
          
          return;
        } else {
          // Remove the sitewide flag if it exists
          localStorage.removeItem('sitewide_theme_active');
          localStorage.removeItem('current_sitewide_theme');
          console.log('No system-wide theme detected, applying path-specific theme');
        }
      } catch (themeError) {
        console.warn('Error getting current theme, using default:', themeError);
        // Try to get from cache
        const cachedTheme = localStorage.getItem(CACHE_KEY);
        if (cachedTheme) {
          try {
            config = JSON.parse(cachedTheme);
            console.log('Using cached theme configuration:', config);
            
            // Check if cached config has sitewide setting
            if (config.sitewide === true) {
              // Use variant if available, otherwise use mode-based theme
              const cachedThemeVariant = config.variant ? 
                VARIANT_TO_THEME_MAP[config.variant] || 'winter' : 
                (config.mode === 'dark' ? 'dark' : 'winter');
              
              console.log(`Cached system-wide theme detected. Applying: ${cachedThemeVariant}`);
              this.applyTheme(cachedThemeVariant);
              
              // Update localStorage flags
              localStorage.setItem('sitewide_theme_active', 'true');
              localStorage.setItem('current_sitewide_theme', cachedThemeVariant);
              
              return;
            }
          } catch (parseError) {
            console.warn('Error parsing cached theme:', parseError);
            config = DEFAULT_CONFIG;
          }
        } else {
          console.log('No cache available, using default theme config');
          config = DEFAULT_CONFIG;
        }
      }
      
      // Check if we still have the sitewide flag but somehow lost the config
      const hasSitewideFlag = localStorage.getItem('sitewide_theme_active') === 'true';
      const sitewideTheme = localStorage.getItem('current_sitewide_theme');
      
      if (hasSitewideFlag && sitewideTheme) {
        console.log(`Found sitewide theme flag in localStorage. Applying global theme: ${sitewideTheme}`);
        this.applyTheme(sitewideTheme);
        return;
      }
      
      const currentPath = window.location.pathname;
      console.log(`Current path: ${currentPath}`);
      
      // Apply appropriate theme based on path
      if (currentPath.startsWith('/admin')) {
        this.applyTheme(config.adminTheme);
        console.log(`Applied admin theme: ${config.adminTheme}`);
      } else if (currentPath.includes('/lawyer') || currentPath.includes('/clients')) {
        // Check both /lawyer and any /clients paths to ensure coverage
        this.applyTheme(config.lawyerTheme);
        console.log(`Applied lawyer theme: ${config.lawyerTheme}`);
      } else {
        // Default theme for other paths - use lawyer theme as default for general pages
        this.applyTheme(config.lawyerTheme || 'winter');
        console.log(`Applied default theme for general path: ${config.lawyerTheme || 'winter'}`);
      }
    } catch (error) {
      console.error('Error applying theme for current path:', error);
      // Fallback to default theme with more logging
      try {
        console.warn('Applying emergency fallback theme: winter');
        this.applyTheme('winter');
      } catch (fallbackError) {
        console.error('Critical error applying fallback theme:', fallbackError);
        // Last resort - reset all theme styles
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-mode');
        // Set some basic styles to prevent completely broken UI
        document.documentElement.style.setProperty('--background', '0 0% 100%');
        document.documentElement.style.setProperty('--foreground', '224 71.4% 4.1%');
      }
    }
  }
}

// Export a singleton instance
export const themeService = new ThemeService(); 