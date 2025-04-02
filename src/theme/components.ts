import { colors, spacing, typography, radii, shadows } from './tokens';

// Button variants
export const buttonStyles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    fontWeight: typography.fontWeights.medium,
    transition: 'all 0.2s',
    cursor: 'pointer',
    padding: `${spacing[2]} ${spacing[4]}`,
  },
  variants: {
    default: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--primary) / 0.9)',
      },
    },
    secondary: {
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--secondary) / 0.9)',
      },
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid hsl(var(--border))',
      color: 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent) / 0.1)',
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent) / 0.1)',
      },
    },
  },
  sizes: {
    sm: {
      fontSize: typography.fontSizes.sm,
      height: spacing[8],
      padding: `${spacing[2]} ${spacing[3]}`,
    },
    md: {
      fontSize: typography.fontSizes.base,
      height: spacing[10],
      padding: `${spacing[2]} ${spacing[4]}`,
    },
    lg: {
      fontSize: typography.fontSizes.lg,
      height: spacing[12],
      padding: `${spacing[3]} ${spacing[6]}`,
    },
  },
};

// Card styles
export const cardStyles = {
  base: {
    backgroundColor: 'hsl(var(--card))',
    borderRadius: radii.lg,
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--card-foreground))',
  },
  variants: {
    default: {
      boxShadow: shadows.sm,
    },
    elevated: {
      boxShadow: shadows.lg,
    },
    glass: {
      backgroundColor: 'hsl(var(--card) / 0.8)',
      backdropFilter: 'blur(12px)',
      border: '1px solid hsl(var(--border) / 0.2)',
    },
  },
};

// Input styles
export const inputStyles = {
  base: {
    width: '100%',
    borderRadius: radii.md,
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--input))',
    color: 'hsl(var(--foreground))',
    fontSize: typography.fontSizes.base,
    '&:focus': {
      outline: 'none',
      ring: `2px solid hsl(var(--ring))`,
      borderColor: 'hsl(var(--ring))',
    },
    '&::placeholder': {
      color: 'hsl(var(--muted-foreground))',
    },
  },
  variants: {
    default: {},
    filled: {
      backgroundColor: 'hsl(var(--muted))',
      border: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
    },
  },
  sizes: {
    sm: {
      height: spacing[8],
      fontSize: typography.fontSizes.sm,
    },
    md: {
      height: spacing[10],
      fontSize: typography.fontSizes.base,
    },
    lg: {
      height: spacing[12],
      fontSize: typography.fontSizes.lg,
    },
  },
};

// Dialog styles
export const dialogStyles = {
  overlay: {
    backgroundColor: 'hsl(var(--background) / 0.8)',
    backdropFilter: 'blur(4px)',
  },
  content: {
    backgroundColor: 'hsl(var(--background))',
    borderRadius: radii.lg,
    border: '1px solid hsl(var(--border))',
    boxShadow: shadows.lg,
    padding: spacing[6],
  },
};

// Navigation styles
export const navigationStyles = {
  base: {
    backgroundColor: 'hsl(var(--background) / 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid hsl(var(--border))',
  },
  link: {
    color: 'hsl(var(--foreground))',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: radii.md,
    '&:hover': {
      backgroundColor: 'hsl(var(--accent) / 0.1)',
    },
    '&.active': {
      backgroundColor: 'hsl(var(--accent) / 0.1)',
      color: 'hsl(var(--accent))',
    },
  },
};

// Table styles
export const tableStyles = {
  base: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  header: {
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'left',
    padding: spacing[3],
  },
  cell: {
    padding: spacing[3],
    borderBottom: '1px solid hsl(var(--border))',
  },
};

// Alert styles
export const alertStyles = {
  base: {
    padding: spacing[4],
    borderRadius: radii.lg,
    border: '1px solid hsl(var(--border))',
  },
  variants: {
    default: {
      backgroundColor: 'hsl(var(--background))',
      borderColor: 'hsl(var(--border))',
    },
    destructive: {
      backgroundColor: 'hsl(var(--destructive) / 0.1)',
      borderColor: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive))',
    },
    warning: {
      backgroundColor: 'hsl(48 96% 89%)',
      borderColor: 'hsl(48 96% 89%)',
      color: 'hsl(48 96% 20%)',
    },
    success: {
      backgroundColor: 'hsl(142 72% 29% / 0.1)',
      borderColor: 'hsl(142 72% 29%)',
      color: 'hsl(142 72% 29%)',
    },
  },
}; 