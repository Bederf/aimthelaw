import React from 'react';
import { Box, Typography, Container, Breadcrumbs, Link, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  gradient?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  gradient = false,
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        py: { xs: 3, md: 4 },
        ...(gradient 
          ? {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 35%, ${theme.palette.secondary.main} 100%)`,
              color: 'white',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 15%)',
                opacity: 0.6,
                zIndex: 1,
              },
            } 
          : {
              borderBottom: 1,
              borderColor: 'divider',
            }
        ),
      }}
    >
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative',
          zIndex: 2,
        }}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            sx={{ 
              mb: 2,
              '& .MuiBreadcrumbs-ol': {
                flexWrap: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              color: gradient ? 'rgba(255,255,255,0.7)' : 'text.secondary',
            }}
          >
            {breadcrumbs.map((breadcrumb, index) => (
              <Box key={`breadcrumb-${index}`}>
                {breadcrumb.href ? (
                  <Link 
                    component={RouterLink} 
                    to={breadcrumb.href}
                    color={gradient ? 'inherit' : 'primary'} 
                    sx={{ 
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {breadcrumb.label}
                  </Link>
                ) : (
                  <Typography
                    color="inherit"
                    variant="body2"
                    sx={{ 
                      fontWeight: 'medium',
                    }}
                  >
                    {breadcrumb.label}
                  </Typography>
                )}
              </Box>
            ))}
          </Breadcrumbs>
        )}
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 1 },
          }}
        >
          <Stack spacing={1}>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </Typography>
            
            {subtitle && (
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  opacity: 0.85,
                  maxWidth: '90%',
                  fontWeight: 'normal',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Stack>
          
          {actions && (
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexShrink: 0,
              }}
            >
              {actions}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PageHeader; 