import { colors } from './tokens';
import { ThemeConfig } from '@/types/theme';

// Theme Modes
export const themeModes = ['light', 'dark'] as const;
export type ThemeMode = typeof themeModes[number];

// Theme Variants
export const themeVariants = ['default', 'purple', 'blue', 'green', 'vibrant', 'premium', 'winter', 'spring', 'summer', 'autumn'] as const;
export type ThemeVariant = typeof themeVariants[number];

export const themes: Record<ThemeMode, Record<ThemeVariant, ThemeConfig>> = {
  light: {
    default: {
      primary: {
        base: 'hsl(222.2 47.4% 11.2%)',
        foreground: 'hsl(210 40% 98%)',
      },
      secondary: {
        base: 'hsl(210 40% 96.1%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      muted: {
        base: 'hsl(210 40% 96.1%)',
        foreground: 'hsl(215.4 16.3% 46.9%)',
      },
      accent: {
        base: 'hsl(210 40% 96.1%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      border: 'hsl(214.3 31.8% 91.4%)',
      input: 'hsl(214.3 31.8% 91.4%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(222.2 47.4% 11.2%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(210 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(210 40% 98%)',
      },
      ring: 'hsl(215 20.2% 65.1%)',
    },
    purple: {
      primary: {
        base: 'hsl(280 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(280 7% 94%)',
        foreground: 'hsl(280 65% 40%)',
      },
      muted: {
        base: 'hsl(280 7% 94%)',
        foreground: 'hsl(280 30% 45%)',
      },
      accent: {
        base: 'hsl(280 30% 92%)',
        foreground: 'hsl(280 65% 40%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(280 63% 15%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(280 63% 15%)',
      },
      border: 'hsl(280 10% 90%)',
      input: 'hsl(280 10% 90%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(280 63% 15%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(280 63% 15%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(280 70% 70%)',
    },
    blue: {
      primary: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(210 40% 98%)',
      },
      secondary: {
        base: 'hsl(210 40% 96.1%)',
        foreground: 'hsl(221.2 83.2% 53.3%)',
      },
      muted: {
        base: 'hsl(210 40% 96.1%)',
        foreground: 'hsl(215.4 16.3% 46.9%)',
      },
      accent: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(210 40% 98%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      border: 'hsl(214.3 31.8% 91.4%)',
      input: 'hsl(214.3 31.8% 91.4%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(222.2 47.4% 11.2%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(210 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(210 40% 98%)',
      },
      ring: 'hsl(221.2 83.2% 53.3%)',
    },
    green: {
      primary: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      secondary: {
        base: 'hsl(140 10% 94%)',
        foreground: 'hsl(142.1 76.2% 36.3%)',
      },
      muted: {
        base: 'hsl(140 10% 94%)',
        foreground: 'hsl(140 30% 45%)',
      },
      accent: {
        base: 'hsl(140 30% 92%)',
        foreground: 'hsl(142.1 76.2% 36.3%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(140 63% 15%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(140 63% 15%)',
      },
      border: 'hsl(140 10% 90%)',
      input: 'hsl(140 10% 90%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(140 63% 15%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(140 63% 15%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(142.1 76.2% 36.3%)',
    },
    vibrant: {
      primary: {
        base: 'hsl(330 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(270 100% 94%)',
        foreground: 'hsl(280 100% 40%)',
      },
      muted: {
        base: 'hsl(240 10% 94%)',
        foreground: 'hsl(260 30% 45%)',
      },
      accent: {
        base: 'hsl(190 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(260 63% 15%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(260 63% 15%)',
      },
      border: 'hsl(240 10% 90%)',
      input: 'hsl(240 10% 90%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(260 63% 15%)',
      destructive: {
        base: 'hsl(350 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142 90% 45%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(40 100% 50%)',
        foreground: 'hsl(260 63% 15%)',
      },
      info: {
        base: 'hsl(210 100% 55%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(330 70% 70%)',
    },
    premium: {
      primary: {
        base: 'hsl(45 100% 50%)',
        foreground: 'hsl(0 0% 10%)',
      },
      secondary: {
        base: 'hsl(240 10% 94%)',
        foreground: 'hsl(210 40% 30%)',
      },
      muted: {
        base: 'hsl(240 10% 94%)',
        foreground: 'hsl(210 20% 40%)',
      },
      accent: {
        base: 'hsl(210 100% 35%)',
        foreground: 'hsl(0 0% 100%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(210 50% 10%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(210 50% 10%)',
      },
      border: 'hsl(240 10% 90%)',
      input: 'hsl(240 10% 90%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(210 50% 10%)',
      destructive: {
        base: 'hsl(350 80% 45%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142 70% 40%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(45 100% 50%)',
        foreground: 'hsl(0 0% 10%)',
      },
      info: {
        base: 'hsl(210 90% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(45 80% 60%)',
    },
    winter: {
      primary: {
        base: 'hsl(210 100% 40%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(200 70% 90%)',
        foreground: 'hsl(210 100% 40%)',
      },
      muted: {
        base: 'hsl(210 50% 95%)',
        foreground: 'hsl(210 60% 40%)',
      },
      accent: {
        base: 'hsl(180 70% 85%)',
        foreground: 'hsl(210 100% 30%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(210 80% 20%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(210 80% 20%)',
      },
      border: 'hsl(210 50% 90%)',
      input: 'hsl(210 50% 90%)',
      background: 'hsl(210 30% 98%)',
      foreground: 'hsl(210 80% 20%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(210 80% 20%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(210 100% 40%)',
    },
    spring: {
      primary: {
        base: 'hsl(130 70% 40%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(90 60% 90%)',
        foreground: 'hsl(130 70% 30%)',
      },
      muted: {
        base: 'hsl(100 40% 95%)',
        foreground: 'hsl(130 50% 35%)',
      },
      accent: {
        base: 'hsl(160 60% 85%)',
        foreground: 'hsl(130 70% 30%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(130 60% 20%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(130 60% 20%)',
      },
      border: 'hsl(120 40% 90%)',
      input: 'hsl(120 40% 90%)',
      background: 'hsl(100 30% 98%)',
      foreground: 'hsl(130 60% 20%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(130 60% 20%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(130 70% 40%)',
    },
    summer: {
      primary: {
        base: 'hsl(30 90% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(40 100% 90%)',
        foreground: 'hsl(30 90% 40%)',
      },
      muted: {
        base: 'hsl(45 80% 95%)',
        foreground: 'hsl(30 70% 40%)',
      },
      accent: {
        base: 'hsl(20 90% 85%)',
        foreground: 'hsl(30 90% 30%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(30 80% 25%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(30 80% 25%)',
      },
      border: 'hsl(40 60% 90%)',
      input: 'hsl(40 60% 90%)',
      background: 'hsl(45 30% 98%)',
      foreground: 'hsl(30 80% 25%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(30 80% 25%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(30 90% 50%)',
    },
    autumn: {
      primary: {
        base: 'hsl(25 90% 40%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(35 80% 90%)',
        foreground: 'hsl(25 90% 30%)',
      },
      muted: {
        base: 'hsl(30 60% 95%)',
        foreground: 'hsl(25 70% 35%)',
      },
      accent: {
        base: 'hsl(15 70% 85%)',
        foreground: 'hsl(25 90% 30%)',
      },
      card: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(25 70% 20%)',
      },
      popover: {
        base: 'hsl(0 0% 100%)',
        foreground: 'hsl(25 70% 20%)',
      },
      border: 'hsl(30 50% 90%)',
      input: 'hsl(30 50% 90%)',
      background: 'hsl(35 20% 98%)',
      foreground: 'hsl(25 70% 20%)',
      destructive: {
        base: 'hsl(0 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(25 70% 20%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(25 90% 40%)',
    },
  },
  dark: {
    default: {
      primary: {
        base: 'hsl(210 40% 98%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      secondary: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(210 40% 98%)',
      },
      muted: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(215 20.2% 65.1%)',
      },
      accent: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(210 40% 98%)',
      },
      card: {
        base: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',
      },
      popover: {
        base: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',
      },
      border: 'hsl(217.2 32.6% 17.5%)',
      input: 'hsl(217.2 32.6% 17.5%)',
      background: 'hsl(222.2 84% 4.9%)',
      foreground: 'hsl(210 40% 98%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(210 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(210 40% 98%)',
      },
      ring: 'hsl(217.2 32.6% 17.5%)',
    },
    purple: {
      primary: {
        base: 'hsl(280 100% 60%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(280 30% 20%)',
        foreground: 'hsl(0 0% 98%)',
      },
      muted: {
        base: 'hsl(280 30% 20%)',
        foreground: 'hsl(280 15% 70%)',
      },
      accent: {
        base: 'hsl(280 50% 30%)',
        foreground: 'hsl(0 0% 98%)',
      },
      card: {
        base: 'hsl(280 50% 5%)',
        foreground: 'hsl(0 0% 98%)',
      },
      popover: {
        base: 'hsl(280 50% 5%)',
        foreground: 'hsl(0 0% 98%)',
      },
      border: 'hsl(280 30% 20%)',
      input: 'hsl(280 30% 20%)',
      background: 'hsl(280 50% 5%)',
      foreground: 'hsl(0 0% 98%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(0 0% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(0 0% 98%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(280 63% 15%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(0 0% 98%)',
      },
      ring: 'hsl(280 50% 30%)',
    },
    blue: {
      primary: {
        base: 'hsl(217.2 91.2% 59.8%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      secondary: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(210 40% 98%)',
      },
      muted: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(215 20.2% 65.1%)',
      },
      accent: {
        base: 'hsl(217.2 32.6% 17.5%)',
        foreground: 'hsl(210 40% 98%)',
      },
      card: {
        base: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',
      },
      popover: {
        base: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',
      },
      border: 'hsl(217.2 32.6% 17.5%)',
      input: 'hsl(217.2 32.6% 17.5%)',
      background: 'hsl(222.2 84% 4.9%)',
      foreground: 'hsl(210 40% 98%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(210 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
      },
      info: {
        base: 'hsl(217.2 91.2% 59.8%)',
        foreground: 'hsl(210 40% 98%)',
      },
      ring: 'hsl(224.3 76.3% 48%)',
    },
    green: {
      primary: {
        base: 'hsl(142.1 70.6% 45.3%)',
        foreground: 'hsl(144.9 80.4% 10%)',
      },
      secondary: {
        base: 'hsl(140 30% 20%)',
        foreground: 'hsl(140 40% 90%)',
      },
      muted: {
        base: 'hsl(140 30% 20%)',
        foreground: 'hsl(140 20% 65%)',
      },
      accent: {
        base: 'hsl(140 30% 20%)',
        foreground: 'hsl(140 40% 90%)',
      },
      card: {
        base: 'hsl(144.9 80.4% 10%)',
        foreground: 'hsl(140 40% 90%)',
      },
      popover: {
        base: 'hsl(144.9 80.4% 10%)',
        foreground: 'hsl(140 40% 90%)',
      },
      border: 'hsl(140 30% 20%)',
      input: 'hsl(140 30% 20%)',
      background: 'hsl(144.9 80.4% 10%)',
      foreground: 'hsl(140 40% 90%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(140 40% 90%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(144.9 80.4% 10%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(140 40% 90%)',
      },
      ring: 'hsl(142.1 70.6% 45.3%)',
    },
    vibrant: {
      primary: {
        base: 'hsl(330 100% 60%)',
        foreground: 'hsl(0 0% 100%)',
      },
      secondary: {
        base: 'hsl(270 40% 20%)',
        foreground: 'hsl(270 100% 80%)',
      },
      muted: {
        base: 'hsl(260 30% 15%)',
        foreground: 'hsl(260 30% 70%)',
      },
      accent: {
        base: 'hsl(190 100% 50%)',
        foreground: 'hsl(0 0% 100%)',
      },
      card: {
        base: 'hsl(260 40% 8%)',
        foreground: 'hsl(260 100% 95%)',
      },
      popover: {
        base: 'hsl(260 40% 8%)',
        foreground: 'hsl(260 100% 95%)',
      },
      border: 'hsl(260 40% 20%)',
      input: 'hsl(260 40% 20%)',
      background: 'hsl(260 40% 8%)',
      foreground: 'hsl(260 100% 95%)',
      destructive: {
        base: 'hsl(350 80% 45%)',
        foreground: 'hsl(0 0% 100%)',
      },
      success: {
        base: 'hsl(142 80% 45%)',
        foreground: 'hsl(0 0% 100%)',
      },
      warning: {
        base: 'hsl(40 100% 50%)',
        foreground: 'hsl(0 0% 20%)',
      },
      info: {
        base: 'hsl(210 100% 55%)',
        foreground: 'hsl(0 0% 100%)',
      },
      ring: 'hsl(330 70% 45%)',
    },
    premium: {
      primary: {
        base: 'hsl(45 100% 55%)',
        foreground: 'hsl(0 0% 10%)',
      },
      secondary: {
        base: 'hsl(215 30% 20%)',
        foreground: 'hsl(0 0% 98%)',
      },
      muted: {
        base: 'hsl(215 30% 15%)',
        foreground: 'hsl(215 20% 65%)',
      },
      accent: {
        base: 'hsl(210 100% 40%)',
        foreground: 'hsl(0 0% 100%)',
      },
      card: {
        base: 'hsl(210 50% 8%)',
        foreground: 'hsl(0 0% 98%)',
      },
      popover: {
        base: 'hsl(210 50% 8%)',
        foreground: 'hsl(0 0% 98%)',
      },
      border: 'hsl(215 30% 20%)',
      input: 'hsl(215 30% 20%)',
      background: 'hsl(210 50% 8%)',
      foreground: 'hsl(0 0% 98%)',
      destructive: {
        base: 'hsl(350 80% 45%)',
        foreground: 'hsl(0 0% 98%)',
      },
      success: {
        base: 'hsl(142 70% 40%)',
        foreground: 'hsl(0 0% 98%)',
      },
      warning: {
        base: 'hsl(45 100% 55%)',
        foreground: 'hsl(0 0% 10%)',
      },
      info: {
        base: 'hsl(210 80% 50%)',
        foreground: 'hsl(0 0% 98%)',
      },
      ring: 'hsl(45 70% 45%)',
    },
    winter: {
      primary: {
        base: 'hsl(210 80% 60%)',
        foreground: 'hsl(210 20% 10%)',
      },
      secondary: {
        base: 'hsl(210 30% 20%)',
        foreground: 'hsl(210 80% 80%)',
      },
      muted: {
        base: 'hsl(210 30% 20%)',
        foreground: 'hsl(210 40% 70%)',
      },
      accent: {
        base: 'hsl(180 40% 30%)',
        foreground: 'hsl(180 70% 90%)',
      },
      card: {
        base: 'hsl(210 50% 10%)',
        foreground: 'hsl(210 80% 90%)',
      },
      popover: {
        base: 'hsl(210 50% 10%)',
        foreground: 'hsl(210 80% 90%)',
      },
      border: 'hsl(210 30% 25%)',
      input: 'hsl(210 30% 25%)',
      background: 'hsl(210 50% 8%)',
      foreground: 'hsl(210 80% 90%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(210 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(210 50% 10%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(210 40% 98%)',
      },
      ring: 'hsl(210 80% 60%)',
    },
    spring: {
      primary: {
        base: 'hsl(130 70% 50%)',
        foreground: 'hsl(130 20% 10%)',
      },
      secondary: {
        base: 'hsl(130 30% 20%)',
        foreground: 'hsl(130 70% 80%)',
      },
      muted: {
        base: 'hsl(130 30% 20%)',
        foreground: 'hsl(130 40% 70%)',
      },
      accent: {
        base: 'hsl(160 40% 30%)',
        foreground: 'hsl(160 70% 90%)',
      },
      card: {
        base: 'hsl(130 40% 10%)',
        foreground: 'hsl(130 70% 90%)',
      },
      popover: {
        base: 'hsl(130 40% 10%)',
        foreground: 'hsl(130 70% 90%)',
      },
      border: 'hsl(130 30% 25%)',
      input: 'hsl(130 30% 25%)',
      background: 'hsl(130 40% 8%)',
      foreground: 'hsl(130 70% 90%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(130 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(130 40% 10%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(130 40% 98%)',
      },
      ring: 'hsl(130 70% 50%)',
    },
    summer: {
      primary: {
        base: 'hsl(30 90% 60%)',
        foreground: 'hsl(30 20% 10%)',
      },
      secondary: {
        base: 'hsl(30 30% 20%)',
        foreground: 'hsl(30 80% 80%)',
      },
      muted: {
        base: 'hsl(30 30% 20%)',
        foreground: 'hsl(30 40% 70%)',
      },
      accent: {
        base: 'hsl(20 40% 30%)',
        foreground: 'hsl(20 70% 90%)',
      },
      card: {
        base: 'hsl(30 40% 10%)',
        foreground: 'hsl(30 70% 90%)',
      },
      popover: {
        base: 'hsl(30 40% 10%)',
        foreground: 'hsl(30 70% 90%)',
      },
      border: 'hsl(30 30% 25%)',
      input: 'hsl(30 30% 25%)',
      background: 'hsl(30 40% 8%)',
      foreground: 'hsl(30 70% 90%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(30 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(30 40% 10%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(30 40% 98%)',
      },
      ring: 'hsl(30 90% 60%)',
    },
    autumn: {
      primary: {
        base: 'hsl(25 90% 50%)',
        foreground: 'hsl(25 20% 10%)',
      },
      secondary: {
        base: 'hsl(25 30% 20%)',
        foreground: 'hsl(25 80% 80%)',
      },
      muted: {
        base: 'hsl(25 30% 20%)',
        foreground: 'hsl(25 40% 70%)',
      },
      accent: {
        base: 'hsl(15 40% 30%)',
        foreground: 'hsl(15 70% 90%)',
      },
      card: {
        base: 'hsl(25 40% 10%)',
        foreground: 'hsl(25 70% 90%)',
      },
      popover: {
        base: 'hsl(25 40% 10%)',
        foreground: 'hsl(25 70% 90%)',
      },
      border: 'hsl(25 30% 25%)',
      input: 'hsl(25 30% 25%)',
      background: 'hsl(25 40% 8%)',
      foreground: 'hsl(25 70% 90%)',
      destructive: {
        base: 'hsl(0 63% 31%)',
        foreground: 'hsl(25 40% 98%)',
      },
      success: {
        base: 'hsl(142.1 76.2% 36.3%)',
        foreground: 'hsl(355.7 100% 97.3%)',
      },
      warning: {
        base: 'hsl(48 96% 53%)',
        foreground: 'hsl(25 40% 10%)',
      },
      info: {
        base: 'hsl(221.2 83.2% 53.3%)',
        foreground: 'hsl(25 40% 98%)',
      },
      ring: 'hsl(25 90% 50%)',
    },
  },
};

export function generateThemeVariables(mode: ThemeMode, variant: ThemeVariant = 'default'): string {
  // Default to 'default' variant if the requested variant doesn't exist
  const safeVariant = themeVariants.includes(variant) ? variant : 'default';
  
  // Default to 'light' mode if the requested mode doesn't exist
  const safeMode = themeModes.includes(mode) ? mode : 'light';
  
  // Get the theme configuration
  const theme = themes[safeMode][safeVariant];
  
  if (!theme) {
    console.error(`Theme not found for mode: ${mode}, variant: ${variant}. Using default theme.`);
    return generateThemeVariables('light', 'default');
  }
  
  const cssVars = {
    '--background': theme.background,
    '--foreground': theme.foreground,
    '--card': theme.card.base,
    '--card-foreground': theme.card.foreground,
    '--popover': theme.popover.base,
    '--popover-foreground': theme.popover.foreground,
    '--primary': theme.primary.base,
    '--primary-foreground': theme.primary.foreground,
    '--secondary': theme.secondary.base,
    '--secondary-foreground': theme.secondary.foreground,
    '--muted': theme.muted.base,
    '--muted-foreground': theme.muted.foreground,
    '--accent': theme.accent.base,
    '--accent-foreground': theme.accent.foreground,
    '--destructive': theme.destructive.base,
    '--destructive-foreground': theme.destructive.foreground,
    '--success': theme.success.base,
    '--success-foreground': theme.success.foreground,
    '--warning': theme.warning.base,
    '--warning-foreground': theme.warning.foreground,
    '--info': theme.info.base,
    '--info-foreground': theme.info.foreground,
    '--border': theme.border,
    '--input': theme.input,
    '--ring': theme.ring,
    '--radius': '0.5rem',
  };

  return Object.entries(cssVars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

export function generateThemeClass(mode: ThemeMode, variant: ThemeVariant = 'default'): string {
  return `
    :root[data-theme="${variant}"][data-mode="${mode}"] {
      ${generateThemeVariables(mode, variant)}
    }
  `;
}

// Helper functions for CSS variables
export const getCssVar = {
  color: (component: string, type: 'base' | 'foreground' = 'base'): string => {
    return `var(--${component}${type === 'foreground' ? '-foreground' : ''})`;
  },
  simple: (variable: string): string => {
    return `var(--${variable})`;
  }
};

// Helper function to get HSL color
export function getHslColor(variable: keyof ThemeConfig): string {
  return `hsl(var(--${variable}))`;
} 