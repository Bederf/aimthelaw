import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

// Material-UI imports
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme } from '@mui/material/styles';

// Material UI Icons
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Cache keys (must match those in AuthContext)
const USER_ROLE_CACHE_KEY = 'user_role_cache';
const CACHE_EXPIRY_KEY = 'user_role_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Feature Card Component using Material-UI
const FeatureCard = ({ title, description, icon: Icon, onFeatureClick }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', mb: 2, color: 'primary.main' }}>
          <Icon fontSize="large" />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          onClick={onFeatureClick}
          endIcon={<ArrowForwardIcon />}
        >
          Learn More
        </Button>
      </CardActions>
    </Card>
  );
};

// Footer Component
const Footer = () => {
  return (
    <Box component="footer" sx={{ py: 3, backgroundColor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}>
          {/* Column 1 */}
          <Box sx={{ width: { xs: '100%', sm: '40%', md: '22%' } }}>
            <Typography variant="h6" gutterBottom>
              AI'm the Law
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Legal innovation powered by AI technology
            </Typography>
          </Box>
          
          {/* Column 2 */}
          <Box sx={{ width: { xs: '100%', sm: '40%', md: '22%' } }}>
            <Typography variant="h6" gutterBottom>
              Features
            </Typography>
            <Link component={RouterLink} to="/dashboard" color="inherit" display="block" sx={{ mb: 1 }}>
              Document Management
            </Link>
            <Link component={RouterLink} to="/ai-lawyer" color="inherit" display="block" sx={{ mb: 1 }}>
              AI Assistant
            </Link>
          </Box>
          
          {/* Column 3 */}
          <Box sx={{ width: { xs: '100%', sm: '40%', md: '22%' } }}>
            <Typography variant="h6" gutterBottom>
              Legal
            </Typography>
            <Link component={RouterLink} to="/terms" color="inherit" display="block" sx={{ mb: 1 }}>
              Terms of Service
            </Link>
            <Link component={RouterLink} to="/privacy" color="inherit" display="block" sx={{ mb: 1 }}>
              Privacy Policy
            </Link>
          </Box>
          
          {/* Column 4 */}
          <Box sx={{ width: { xs: '100%', sm: '40%', md: '22%' } }}>
            <Typography variant="h6" gutterBottom>
              Contact
            </Typography>
            <Typography variant="body2" color="text.secondary">
              info@aithelaw.com
            </Typography>
          </Box>
        </Box>
        
        <Box mt={5}>
          <Typography variant="body2" color="text.secondary" align="center">
            {'Copyright © '}
            <Link color="inherit" component={RouterLink} to="/">
              AI'm the Law
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

const Landing = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const theme = useTheme();

  // Helper function to cache user role
  const cacheUserRole = (userId: string, role: string) => {
    try {
      // Get existing cache or create new one
      const existingCache = localStorage.getItem(USER_ROLE_CACHE_KEY);
      const cache = existingCache ? JSON.parse(existingCache) : {};
      
      // Update cache with new role
      cache[userId] = role;
      
      // Set expiry time
      const expiry = Date.now() + CACHE_DURATION;
      
      // Save to localStorage
      localStorage.setItem(USER_ROLE_CACHE_KEY, JSON.stringify(cache));
      localStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
      
      console.log('[Landing] Role cached successfully for user:', userId);
    } catch (error) {
      console.error('[Landing] Error writing to cache:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login form submitted with email:', email);
    setLoading(true);
    setLoginError(null);

    try {
      // First handle the login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        setLoginError(error.message);
        throw error;
      }

      console.log('Auth successful:', data.user?.id);

      // Close the dialog immediately after successful auth
      setIsLoginOpen(false);
      toast.success('Successfully logged in!');

      // Determine role from email pattern for caching
      let inferredRole = 'client'; // Default role
      if (email.includes('admin') || email.includes('admin@')) {
        inferredRole = 'admin';
      } else if (email.includes('lawyer') || email.includes('law.com')) {
        inferredRole = 'lawyer';
      }
      
      // Cache the inferred role
      if (data.user?.id) {
        cacheUserRole(data.user.id, inferredRole);
      }

      // Direct navigation based on email domain or pattern
      // This is a fallback in case profile query fails
      if (email.includes('admin') || email.includes('admin@')) {
        console.log('Email suggests admin role, navigating directly...');
        window.location.href = '/admin/dashboard';
        return;
      } else if (email.includes('lawyer') || email.includes('law.com')) {
        console.log('Email suggests lawyer role, navigating directly...');
        window.location.href = `/lawyer/dashboard/${data.user?.id}`;
        return;
      } else if (email.includes('client')) {
        console.log('Email suggests client role, navigating directly...');
        window.location.href = '/client/dashboard';
        return;
      }

      // Try to get the user's role with timeout protection
      try {
        console.log('Attempting to fetch profile with timeout protection...');
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Profile query timed out'));
          }, 3000); // 3 second timeout
        });
        
        const profilePromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user?.id)
          .single();
          
        // Race the promises
        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise.then(() => ({ data: null, error: new Error("Timeout") }))
        ]) as any;

        if (profileError) {
          console.error('Profile error:', profileError);
          throw new Error('Failed to fetch user profile');
        }

        if (!profile) {
          console.error('No profile found');
          throw new Error('User profile not found');
        }

        console.log('Profile found:', profile);
        
        // Cache the role from profile
        if (data.user?.id && profile.role) {
          cacheUserRole(data.user.id, profile.role);
        }

        // Navigate based on role
        switch (profile.role) {
          case 'lawyer':
            console.log('Navigating to lawyer dashboard...');
            window.location.href = `/lawyer/dashboard/${data.user?.id}`;
            break;
          case 'admin':
            console.log('Navigating to admin dashboard...');
            window.location.href = '/admin/dashboard';
            break;
          default:
            console.log('Navigating to client dashboard...');
            window.location.href = '/client/dashboard';
        }
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        // Fallback to direct navigation based on email pattern
        if (email.includes('admin')) {
          window.location.href = '/admin/dashboard';
        } else if (email.includes('lawyer') || email.includes('law.com')) {
          window.location.href = `/lawyer/dashboard/${data.user?.id}`;
        } else {
          window.location.href = '/client/dashboard';
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle direct role selection
  const handleDirectLogin = async (selectedRole: string) => {
    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setLoginError(null);
    
    try {
      // First handle the login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        setLoginError(error.message);
        throw error;
      }

      console.log('Auth successful, using direct role selection:', selectedRole);
      
      // Close the dialog
      setIsLoginOpen(false);
      toast.success(`Successfully logged in as ${selectedRole}!`);
      
      // Cache the selected role
      if (data.user?.id) {
        cacheUserRole(data.user.id, selectedRole);
      }
      
      // Navigate based on selected role
      switch (selectedRole) {
        case 'lawyer':
          console.log('Directly navigating to lawyer dashboard...');
          window.location.href = `/lawyer/dashboard/${data.user?.id}`;
          break;
        case 'admin':
          console.log('Directly navigating to admin dashboard...');
          window.location.href = '/admin/dashboard';
          break;
        case 'client':
          console.log('Directly navigating to client dashboard...');
          window.location.href = '/client/dashboard';
          break;
      }
    } catch (error) {
      console.error('Direct login error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Legal Document Management",
      description: "Efficiently organize and manage all your legal documents in one place",
      icon: BusinessIcon,
      link: "/dashboard",
      detailedDescription: `
**Centralized Document Hub:**  Effortlessly upload, organize, and manage all your legal documents in a secure, unified platform.  No more scattered files or lost documents.  Our system provides robust document management features to keep your practice organized and efficient.
`
    },
    {
      title: "Global Accessibility",
      description: "Access your legal resources from anywhere, anytime",
      icon: PublicIcon,
      link: "/dashboard",
      detailedDescription: `
**Access Anywhere, Anytime:**  Securely access your legal documents and AI-powered tools from any device, wherever you are.  Whether you're in the office, at court, or working remotely, your legal resources are always at your fingertips, ensuring seamless workflow and client service.
`
    },
    {
      title: "Secure & Confidential",
      description: "Bank-level security for all your sensitive legal information",
      icon: SecurityIcon,
      link: "/dashboard",
      detailedDescription: `
**Enterprise-Grade Security:**  Rest easy knowing your sensitive legal information is protected with bank-level security measures.  We prioritize confidentiality with robust encryption and secure infrastructure, ensuring compliance and safeguarding your clients' trust.
`
    },
    {
      title: "AI-Powered Legal Assistant",
      description: "Get instant legal insights and document analysis",
      icon: GavelIcon,
      link: "/ai-lawyer",
      detailedDescription: `
**Instant Legal Insights:**  Empower your practice with AI-driven document analysis, key information extraction, and legal insights.  Quickly analyze contracts, letters, and legal documents to gain a competitive edge, make informed decisions faster, and deliver superior legal services.  Leverage features like AI Chat, Chronology Generation, and Letter Reply Drafting to boost your productivity.
`
    }
  ];

  const handleFeatureClick = (feature: any) => {
    console.log("handleFeatureClick called for:", feature.title);
    setSelectedFeature(feature);
    setIsFeatureModalOpen(true);
  };

  const handleDirectRoleSelection = async (role: string) => {
    console.log(`[handleDirectRoleSelection] Selected role: ${role}`);
    
    try {
      // Get current user
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[handleDirectRoleSelection] Error getting user:', error);
        toast.error("Authentication Error: Could not verify your identity. Please try again.");
        return;
      }
      
      const userId = data?.user?.id || 'unknown';
      console.log(`[handleDirectRoleSelection] User ID: ${userId}`);
      
      // Save role to localStorage for future reference
      localStorage.setItem('user_role', role);
      
      // Show toast notification
      toast.success(`Redirecting to ${role} dashboard...`);
      
      // Force navigate based on role
      console.log(`[handleDirectRoleSelection] Navigating to ${role} dashboard`);
      
      // Directly navigate without any complex logic
      if (role === 'lawyer') {
        window.location.href = `/lawyer/dashboard/${userId}`;
      } else if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (role === 'client') {
        window.location.href = '/client/dashboard';
      }
    } catch (error) {
      console.error('[handleDirectRoleSelection] Unexpected error:', error);
      toast.error("Navigation Error: Could not navigate to your dashboard. Please try again.");
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar/AppBar - Made slightly more transparent */}
      <AppBar 
        position="fixed" 
        color="default" 
        elevation={0} 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              <Box component="span" sx={{ color: 'primary.main' }}>AI'm</Box> the Law
            </Typography>
          </RouterLink>
          
          <Stack direction="row" spacing={2}>
            <Button color="inherit" onClick={() => setIsLoginOpen(true)}>Login</Button>
            <Button 
              variant="contained" 
              color="primary" 
              component={RouterLink} 
              to="/register"
              sx={{
                fontWeight: 'medium',
                boxShadow: 2
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      
      {/* Toolbar spacer to prevent content from being hidden under AppBar */}
      <Toolbar />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Enhanced Hero Section */}
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 35%, ${theme.palette.secondary.main} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            pt: { xs: 4, md: 0 },
            pb: { xs: 4, md: 0 },
            
            // Add subtle patterns/effects for visual interest
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
          }}
        >
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: 6,
              alignItems: 'center'
            }}>
              {/* Left Column: Headline and CTAs */}
              <Box sx={{ 
                flex: 1,
                width: { xs: '100%', md: '50%' },
                mb: { xs: 6, md: 0 } 
              }}>
                <Typography 
                  variant="h2" 
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    mb: 3,
                  }}
                >
                  Legal Innovation Powered by AI
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mb: 4, 
                    opacity: 0.9,
                    maxWidth: '90%',
                    fontWeight: 'normal',
                    lineHeight: 1.5,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  }}
                >
                  Transform your legal practice with AI-powered document management, insights, and client collaboration.
                </Typography>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={3} 
                  sx={{ mt: 5 }}
                >
                  <Button
                    variant="contained" 
                    size="large" 
                    component={RouterLink} 
                    to="/register"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      px: 4, 
                      py: 1.8, 
                      backgroundColor: 'white', 
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    sx={{ 
                      px: 4, 
                      py: 1.8,
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      borderColor: 'white', 
                      borderWidth: 2,
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        borderWidth: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }
                    }}
                  >
                  Learn More
                </Button>
                </Stack>
              </Box>

              {/* Right Column: Sign-Up Form */}
              <Box sx={{ 
                flex: 1, 
                width: { xs: '100%', md: '50%' },
                display: 'flex',
                justifyContent: { xs: 'center', md: 'flex-end' }
              }}>
                <Paper 
                  elevation={24} 
                  sx={{ 
                    p: { xs: 3, sm: 5 }, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.98)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
                    transform: 'translateY(0)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    },
                    maxWidth: { xs: '100%', md: '480px' },
                    width: '100%'
                  }}
                >
                  <Stack spacing={3.5}>
                    <div>
                      <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                        Get Started Today
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                      Enter your details to create your account
                      </Typography>
                    </div>
                    
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      placeholder="name@example.com"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon />
                          </InputAdornment>
                        ),
                      }}
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused fieldset': {
                            borderWidth: 2,
                            borderColor: theme.palette.primary.main,
                          }
                        }
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon />
                          </InputAdornment>
                        ),
                      }}
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused fieldset': {
                            borderWidth: 2,
                            borderColor: theme.palette.primary.main,
                          }
                        }
                      }}
                    />
                    
                    <Button 
                      fullWidth 
                      variant="contained" 
                      size="large"
                      component={RouterLink}
                      to="/register"
                      sx={{ 
                        py: 1.8, 
                        borderRadius: 2,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        fontSize: '1rem',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        mt: 2,
                      }}
                    >
                      Create Account
                  </Button>
                    
                    <Typography variant="body2" align="center" color="text.secondary">
                      Already have an account?{' '}
                      <Link 
                        component="button" 
                        onClick={() => setIsLoginOpen(true)}
                        sx={{ fontWeight: 'medium' }}
                      >
                        Sign in
                      </Link>
                    </Typography>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Features Section - with enhanced styling */}
        <Container 
          sx={{ 
            py: { xs: 8, md: 12 },
            position: 'relative'
          }}
        >
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            textAlign="center"
            sx={{ 
              mb: { xs: 6, md: 8 },
              position: 'relative',
              '&::after': {
                content: '""',
                display: 'block',
                width: '60px',
                height: '4px',
                backgroundColor: theme.palette.primary.main,
                margin: '0.8rem auto 0',
                borderRadius: '2px'
              }
            }}
          >
            Key Features
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              mx: -2 // Negative margin to compensate for padding
            }}
          >
            {features.map((feature) => (
              <Box 
                key={feature.title}
                sx={{
                  width: { 
                    xs: '100%', 
                    sm: '50%', 
                    md: '25%' 
                  },
                  p: 2, // Padding to create gap
                }}
              >
              <FeatureCard
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                onFeatureClick={() => handleFeatureClick(feature)}
                />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Feature Detail Dialog */}
      <Dialog open={isFeatureModalOpen} onClose={() => setIsFeatureModalOpen(false)} maxWidth="md">
            <DialogTitle>{selectedFeature?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
          {selectedFeature?.detailedDescription && (
              <Box sx={{ mt: 2 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedFeature.detailedDescription}
              </ReactMarkdown>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFeatureModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={isLoginOpen} onClose={() => setIsLoginOpen(false)}>
        <DialogTitle>Login to your account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter your credentials to access your account
          </DialogContentText>
          
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            {loginError && (
              <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.dark' }}>
                <Typography variant="body2">{loginError}</Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', px: 3, pb: 3 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Link component={RouterLink} to="/register" color="primary">
                Register
              </Link>
            </Typography>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Landing;
