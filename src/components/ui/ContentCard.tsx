import React from 'react';
import { Paper, Box, Typography, Divider, Card, CardHeader, CardContent, CardActions } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ContentCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footerActions?: React.ReactNode;
  elevation?: number;
  noPadding?: boolean;
  sx?: any;
}

const ContentCard: React.FC<ContentCardProps> = ({
  children,
  title,
  subtitle,
  actions,
  footerActions,
  elevation = 3,
  noPadding = false,
  sx = {},
}) => {
  const theme = useTheme();
  
  // If we don't have a title, subtitle, or actions, use a simpler Paper component
  if (!title && !subtitle && !actions && !footerActions) {
    return (
      <Paper
        elevation={elevation}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: `0 8px 24px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)'}`,
          },
          ...(noPadding ? {} : { p: 3 }),
          ...sx,
        }}
      >
        {children}
      </Paper>
    );
  }
  
  // Otherwise, use the Card component for more structured content
  return (
    <Card
      elevation={elevation}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: `0 8px 24px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)'}`,
        },
        ...sx,
      }}
    >
      {(title || subtitle || actions) && (
        <CardHeader
          title={
            title && (
              <Typography variant="h6" fontWeight="bold">
                {title}
              </Typography>
            )
          }
          subheader={
            subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )
          }
          action={actions}
          sx={{ pb: subtitle ? 2 : 1 }}
        />
      )}
      
      <CardContent sx={noPadding ? { p: 0 } : {}}>
        {children}
      </CardContent>
      
      {footerActions && (
        <>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            {footerActions}
          </CardActions>
        </>
      )}
    </Card>
  );
};

export default ContentCard; 