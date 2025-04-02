import { createTheme, ThemeOptions } from '@mui/material/styles';
import { ThemeMode, ThemeVariant, themes } from './themes';

/**
 * Convert HSL string to RGB values
 * @param hslString HSL string in format "hsl(h s% l%)" or just "h s% l%"
 */
function hslToRgb(hslString: string): string {
  // Extract the HSL values
  const hsl = hslString.replace('hsl(', '').replace(')', '').split(' ');
  
  if (hsl.length < 3) {
    return '#000000'; // Fallback to black
  }
  
  const h = parseFloat(hsl[0]) / 360;
  const s = parseFloat(hsl[1].replace('%', '')) / 100;
  const l = parseFloat(hsl[2].replace('%', '')) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  // Convert to hex
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Create a Material-UI theme that matches the current app theme
 */
export function createMaterialTheme(mode: ThemeMode, variant: ThemeVariant): ThemeOptions {
  // Get the theme configuration from the existing theme system
  const themeConfig = themes[mode][variant];
  
  if (!themeConfig) {
    console.error(`Theme not found for mode: ${mode}, variant: ${variant}. Using default theme.`);
    return createMaterialTheme('light', 'default');
  }
  
  // Convert HSL colors to hex for Material-UI
  const primary = hslToRgb(themeConfig.primary.base);
  const secondary = hslToRgb(themeConfig.secondary.base);
  const error = hslToRgb(themeConfig.destructive.base);
  const warning = hslToRgb(themeConfig.warning.base);
  const info = hslToRgb(themeConfig.info.base);
  const success = hslToRgb(themeConfig.success.base);
  const background = hslToRgb(themeConfig.background);
  const paper = hslToRgb(themeConfig.card.base);
  const text = hslToRgb(themeConfig.foreground);
  const textSecondary = hslToRgb(themeConfig.muted.foreground);
  
  return {
    palette: {
      mode: mode,
      primary: {
        main: primary,
        contrastText: hslToRgb(themeConfig.primary.foreground),
      },
      secondary: {
        main: secondary,
        contrastText: hslToRgb(themeConfig.secondary.foreground),
      },
      error: {
        main: error,
        contrastText: hslToRgb(themeConfig.destructive.foreground),
      },
      warning: {
        main: warning,
        contrastText: hslToRgb(themeConfig.warning.foreground),
      },
      info: {
        main: info,
        contrastText: hslToRgb(themeConfig.info.foreground),
      },
      success: {
        main: success,
        contrastText: hslToRgb(themeConfig.success.foreground),
      },
      background: {
        default: background,
        paper: paper,
      },
      text: {
        primary: text,
        secondary: textSecondary,
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
      },
      body1: {
        fontSize: '1rem',
      },
      body2: {
        fontSize: '0.875rem',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: mode === 'light' ? '0 2px 4px rgba(0,0,0,0.05)' : '0 2px 4px rgba(0,0,0,0.2)',
            '&:hover': {
              boxShadow: mode === 'light' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 4px 8px rgba(0,0,0,0.3)',
            },
          },
          containedPrimary: {
            color: hslToRgb(themeConfig.primary.foreground),
          },
          containedSecondary: {
            color: hslToRgb(themeConfig.secondary.foreground),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: mode === 'light'
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' 
              ? '0 1px 3px rgba(0,0,0,0.05)' 
              : '0 1px 3px rgba(0,0,0,0.2)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: primary,
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            boxShadow: mode === 'light'
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          },
        },
      },
    },
  };
}

// Create and export the theme
export function getMaterialTheme(mode: ThemeMode, variant: ThemeVariant) {
  return createTheme(createMaterialTheme(mode, variant));
}

export default getMaterialTheme; 