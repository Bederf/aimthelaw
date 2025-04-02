import React from 'react';
import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  Divider,
  CircularProgress,
  SxProps,
  Theme,
} from '@mui/material';
import ContentCard from './ContentCard';

interface FormLayoutProps {
  /** Form title */
  title?: string;
  /** Form subtitle or description */
  subtitle?: string;
  /** The form content (usually inputs and fields) */
  children: React.ReactNode;
  /** Optional actions to display in the form header */
  headerActions?: React.ReactNode;
  /** Primary submit button text. If not provided, no submit button will be shown */
  submitText?: string;
  /** Cancel button text. If not provided, no cancel button will be shown */
  cancelText?: string;
  /** Additional actions to display in the footer */
  additionalActions?: React.ReactNode;
  /** Loading state to disable buttons and show loading indicator */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Success message to display */
  success?: string | null;
  /** Function to call when the form is submitted */
  onSubmit?: (e: React.FormEvent) => void;
  /** Function to call when the cancel button is clicked */
  onCancel?: () => void;
  /** Columns layout for the form fields (1, 2, or 3) */
  columns?: 1 | 2 | 3;
  /** Grid spacing between form fields */
  spacing?: number;
  /** Additional styles for the root container */
  sx?: SxProps<Theme>;
  /** Card props to pass to the ContentCard component */
  cardProps?: React.ComponentProps<typeof ContentCard>;
}

/**
 * FormLayout - A standardized layout component for forms
 * 
 * This component provides a consistent structure for forms throughout the application
 * with standard styling, spacing, and behavior for form fields, buttons, and messages.
 */
export default function FormLayout({
  title,
  subtitle,
  children,
  headerActions,
  submitText,
  cancelText,
  additionalActions,
  isLoading = false,
  error = null,
  success = null,
  onSubmit,
  onCancel,
  columns = 1,
  spacing = 3,
  sx,
  cardProps,
}: FormLayoutProps) {
  // Determine the column width based on the columns prop
  const getColumnWidth = () => {
    switch (columns) {
      case 1:
        return 12;
      case 2:
        return 6;
      case 3:
        return 4;
      default:
        return 12;
    }
  };

  // Function to wrap each direct child in a Grid item
  const wrapChildrenInGrid = () => {
    const childArray = React.Children.toArray(children);
    
    // If children is a Grid container already, just return it
    if (childArray.length === 1 && React.isValidElement(childArray[0]) && childArray[0].type === Grid) {
      return children;
    }
    
    return (
      <Grid container spacing={spacing}>
        {childArray.map((child, index) => (
          <Grid item xs={12} sm={getColumnWidth()} key={index}>
            {child}
          </Grid>
        ))}
      </Grid>
    );
  };

  // Check if we should show the form actions
  const showFormActions = submitText || cancelText || additionalActions;

  return (
    <ContentCard
      title={title}
      subtitle={subtitle}
      actions={headerActions}
      sx={sx}
      {...cardProps}
    >
      {/* Error or Success Message */}
      {(error || success) && (
        <Box 
          sx={{ 
            mb: 3, 
            p: 2, 
            borderRadius: 1,
            backgroundColor: error ? 'error.lighter' : 'success.lighter',
            color: error ? 'error.main' : 'success.main',
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {error || success}
          </Typography>
        </Box>
      )}

      {/* Form Content */}
      <Box 
        component="form" 
        onSubmit={onSubmit ? (e) => {
          e.preventDefault();
          onSubmit(e);
        } : undefined}
        noValidate
        sx={{ width: '100%' }}
      >
        {wrapChildrenInGrid()}

        {/* Form Actions */}
        {showFormActions && (
          <>
            <Divider sx={{ my: 4 }} />
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              justifyContent="flex-end"
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              {additionalActions && (
                <Box sx={{ flexGrow: 1 }}>
                  {additionalActions}
                </Box>
              )}
              
              {cancelText && onCancel && (
                <Button
                  variant="outlined"
                  color="primary"
                  disabled={isLoading}
                  onClick={onCancel}
                >
                  {cancelText}
                </Button>
              )}
              
              {submitText && (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isLoading ? 'Submitting...' : submitText}
                </Button>
              )}
            </Stack>
          </>
        )}
      </Box>
    </ContentCard>
  );
} 