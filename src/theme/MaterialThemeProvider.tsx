import React from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, useTheme as useMuiTheme } from '@mui/material';
// Fix the ThemeContext import by using the built-in MUI theme hooks instead
// import { useTheme } from '@/contexts/ThemeContext';
import { getMaterialTheme } from './materialTheme';

interface MaterialThemeProviderProps {
  children: React.ReactNode;
  mode?: 'light' | 'dark';
  variant?: string;
}

export const MaterialThemeProvider: React.FC<MaterialThemeProviderProps> = ({ 
  children,
  mode = 'light',
  variant = 'default'
}) => {
  // Use built-in MUI theme instead of the missing context
  const muiTheme = useMuiTheme();
  
  // Get Material-UI theme based on our app theme
  const theme = getMaterialTheme(mode, variant);
  
  // Add specific component customizations for chat interface
  const enhancedTheme = createTheme({
    ...theme,
    components: {
      ...theme.components,
      MuiPaper: {
        ...theme.components?.MuiPaper,
        styleOverrides: {
          ...theme.components?.MuiPaper?.styleOverrides,
          root: {
            ...(theme.components?.MuiPaper?.styleOverrides?.root as Record<string, unknown>),
            '&.MuiPaper-chatBubble': {
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            },
          }
        }
      },
      MuiTextField: {
        ...theme.components?.MuiTextField,
        styleOverrides: {
          ...theme.components?.MuiTextField?.styleOverrides,
          root: {
            ...(theme.components?.MuiTextField?.styleOverrides?.root as Record<string, unknown>),
            '&.MuiTextField-chatInput': {
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
              }
            },
          }
        }
      },
      MuiAvatar: {
        ...theme.components?.MuiAvatar,
        styleOverrides: {
          ...theme.components?.MuiAvatar?.styleOverrides,
          root: {
            ...(theme.components?.MuiAvatar?.styleOverrides?.root as Record<string, unknown>),
            fontFamily: theme.typography.fontFamily,
            fontWeight: 500,
          }
        }
      },
      MuiButton: {
        ...theme.components?.MuiButton,
        variants: [
          ...(theme.components?.MuiButton?.variants || []),
          {
            props: { variant: 'contained', size: 'small', className: 'chat-send-button' },
            style: {
              minWidth: '40px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: 0,
            },
          },
        ],
      },
    },
  });

  return (
    <MuiThemeProvider theme={enhancedTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default MaterialThemeProvider; 