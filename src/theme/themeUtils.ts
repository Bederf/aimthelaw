import { ThemeMode, ThemeVariant, themes, themeModes, themeVariants } from './themes';

/**
 * Extracts the HSL values from an HSL color string
 * Input: "hsl(222.2 47.4% 11.2%)"
 * Output: "222.2 47.4% 11.2%"
 */
function extractHslValues(hslString: string): string {
  // If it's already just the values, return as is
  if (!hslString.startsWith('hsl(')) {
    return hslString;
  }
  
  // Extract the values from inside the hsl() function
  const match = hslString.match(/hsl\((.*)\)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback
  return hslString;
}

/**
 * Directly applies theme CSS variables to the document root element
 * This is a more direct approach than using the generateThemeClass function
 */
export function applyTheme(mode: ThemeMode, variant: ThemeVariant): void {
  // Validate inputs
  const safeMode = themeModes.includes(mode) ? mode : 'light';
  const safeVariant = themeVariants.includes(variant) ? variant : 'default';
  
  // Get the theme configuration
  const theme = themes[safeMode][safeVariant];
  
  if (!theme) {
    console.error(`Theme not found for mode: ${mode}, variant: ${variant}. Using default theme.`);
    applyTheme('light', 'default');
    return;
  }
  
  // Set data attributes
  document.documentElement.setAttribute('data-mode', safeMode);
  document.documentElement.setAttribute('data-theme', safeVariant);
  
  // Apply CSS variables directly to the document root
  const root = document.documentElement;
  
  // Background and foreground
  root.style.setProperty('--background', extractHslValues(theme.background));
  root.style.setProperty('--foreground', extractHslValues(theme.foreground));
  
  // Card
  root.style.setProperty('--card', extractHslValues(theme.card.base));
  root.style.setProperty('--card-foreground', extractHslValues(theme.card.foreground));
  
  // Popover
  root.style.setProperty('--popover', extractHslValues(theme.popover.base));
  root.style.setProperty('--popover-foreground', extractHslValues(theme.popover.foreground));
  
  // Primary
  root.style.setProperty('--primary', extractHslValues(theme.primary.base));
  root.style.setProperty('--primary-foreground', extractHslValues(theme.primary.foreground));
  
  // Secondary
  root.style.setProperty('--secondary', extractHslValues(theme.secondary.base));
  root.style.setProperty('--secondary-foreground', extractHslValues(theme.secondary.foreground));
  
  // Muted
  root.style.setProperty('--muted', extractHslValues(theme.muted.base));
  root.style.setProperty('--muted-foreground', extractHslValues(theme.muted.foreground));
  
  // Accent
  root.style.setProperty('--accent', extractHslValues(theme.accent.base));
  root.style.setProperty('--accent-foreground', extractHslValues(theme.accent.foreground));
  
  // Destructive
  root.style.setProperty('--destructive', extractHslValues(theme.destructive.base));
  root.style.setProperty('--destructive-foreground', extractHslValues(theme.destructive.foreground));
  
  // Success
  root.style.setProperty('--success', extractHslValues(theme.success.base));
  root.style.setProperty('--success-foreground', extractHslValues(theme.success.foreground));
  
  // Warning
  root.style.setProperty('--warning', extractHslValues(theme.warning.base));
  root.style.setProperty('--warning-foreground', extractHslValues(theme.warning.foreground));
  
  // Info
  root.style.setProperty('--info', extractHslValues(theme.info.base));
  root.style.setProperty('--info-foreground', extractHslValues(theme.info.foreground));
  
  // Border, input, and ring
  root.style.setProperty('--border', extractHslValues(theme.border));
  root.style.setProperty('--input', extractHslValues(theme.input));
  root.style.setProperty('--ring', extractHslValues(theme.ring));
  
  // Radius
  root.style.setProperty('--radius', '0.5rem');
  
  // Also add a style element with direct CSS for better compatibility
  const styleId = 'theme-direct-styles';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  // Create CSS rules that directly apply the theme colors to common elements
  styleElement.textContent = `
    /* Direct theme application */
    :root {
      color-scheme: ${safeMode};
    }
    
    body {
      background-color: hsl(${extractHslValues(theme.background)});
      color: hsl(${extractHslValues(theme.foreground)});
    }
    
    .bg-background {
      background-color: hsl(${extractHslValues(theme.background)}) !important;
    }
    
    .text-foreground {
      color: hsl(${extractHslValues(theme.foreground)}) !important;
    }
    
    .bg-primary {
      background-color: hsl(${extractHslValues(theme.primary.base)}) !important;
    }
    
    .text-primary {
      color: hsl(${extractHslValues(theme.primary.base)}) !important;
    }
    
    .text-primary-foreground {
      color: hsl(${extractHslValues(theme.primary.foreground)}) !important;
    }
    
    .bg-secondary {
      background-color: hsl(${extractHslValues(theme.secondary.base)}) !important;
    }
    
    .text-secondary {
      color: hsl(${extractHslValues(theme.secondary.base)}) !important;
    }
    
    .text-secondary-foreground {
      color: hsl(${extractHslValues(theme.secondary.foreground)}) !important;
    }
    
    .bg-muted {
      background-color: hsl(${extractHslValues(theme.muted.base)}) !important;
    }
    
    .text-muted {
      color: hsl(${extractHslValues(theme.muted.base)}) !important;
    }
    
    .text-muted-foreground {
      color: hsl(${extractHslValues(theme.muted.foreground)}) !important;
    }
    
    .bg-accent {
      background-color: hsl(${extractHslValues(theme.accent.base)}) !important;
    }
    
    .text-accent {
      color: hsl(${extractHslValues(theme.accent.base)}) !important;
    }
    
    .text-accent-foreground {
      color: hsl(${extractHslValues(theme.accent.foreground)}) !important;
    }
    
    /* Button styles */
    button[class*="Button"] {
      background-color: hsl(${extractHslValues(theme.primary.base)});
      color: hsl(${extractHslValues(theme.primary.foreground)});
    }
    
    /* Card styles */
    div[class*="Card"] {
      background-color: hsl(${extractHslValues(theme.card.base)});
      color: hsl(${extractHslValues(theme.card.foreground)});
    }
  `;
  
  console.log(`Applied theme: mode=${safeMode}, variant=${safeVariant}`);
} 