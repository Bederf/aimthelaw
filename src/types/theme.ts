/**
 * Theme configuration types
 */

interface ColorPair {
  base: string;
  foreground: string;
}

export interface ThemeConfig {
  primary: ColorPair;
  secondary: ColorPair;
  muted: ColorPair;
  accent: ColorPair;
  card: ColorPair;
  popover: ColorPair;
  border: string;
  input: string;
  background: string;
  foreground: string;
  destructive: ColorPair;
  success: ColorPair;
  warning: ColorPair;
  info: ColorPair;
  ring: string;
}

// Legacy theme config for the old theme system
export interface LegacyThemeConfig {
  lawyerTheme: string;
  adminTheme: string;
  updatedAt: string;
} 