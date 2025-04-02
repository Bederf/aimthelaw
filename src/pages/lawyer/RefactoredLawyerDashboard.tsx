import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';

// Material-UI imports
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  AlertTitle,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';

// Material-UI icons
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Timeline as TimelineIcon,
  Error as ErrorIcon,
  Calculate as CalculateIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarMonth as CalendarMonthIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material';

// Custom UI components
import PageHeader from '@/components/ui/PageHeader';
import ContentCard from '@/components/ui/ContentCard';

// Types
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalClients: number;
  totalDocuments: number;
}

// Feature definitions
const features = [
  {
    title: 'Case Management',
    description: 'Manage your legal cases efficiently with our comprehensive case management system.',
    icon: WorkIcon,
    link: '/lawyer/cases',
  },
  {
    title: 'Client Portal',
    description: 'Access and manage your client information in one centralized location.',
    icon: PeopleIcon,
    link: '/lawyer/clients',
  },
  {
    title: 'Document Management',
    description: 'Organize and access all your legal documents securely.',
    icon: DescriptionIcon,
    link: '/lawyer/documents',
  },
  {
    title: 'Maintenance Calculator',
    description: 'Calculate maintenance obligations using financial documents and transaction analysis.',
    icon: CalculateIcon,
    link: '/lawyer/maintenance',
    isNew: true,
  },
  {
    title: 'Cost Management',
    description: 'Track and manage AI service costs and token usage.',
    icon: AttachMoneyIcon,
    link: '/lawyer/costs',
  },
  {
    title: 'Scheduling',
    description: 'Manage your appointments and court dates with our scheduling system.',
    icon: CalendarMonthIcon,
    link: '/lawyer/scheduling',
  },
];

// Component for stats card
const StatsCard = ({ title, value, icon: Icon, loading }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        borderRadius: 2,
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.light',
            color: 'primary.main',
            mr: 2,
          }}
        >
          <Icon fontSize="medium" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
          {title}
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Typography variant="h3" sx={{ fontWeight: 'bold', mt: 'auto' }}>
          {value.toLocaleString()}
        </Typography>
      )}
    </Paper>
  );
};

// Component for feature card
const FeatureCard = ({ title, description, icon: Icon, link, isNew = false }) => {
  const navigate = useNavigate();
  
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      {isNew && (
        <Chip
          label="New"
          color="secondary"
          size="small"
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            fontWeight: 'bold',
          }}
        />
      )}
      
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.light',
            color: 'primary.main',
            mb: 2,
          }}
        >
          <Icon fontSize="large" />
        </Box>
        
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
          {description}
        </Typography>
        
        <Button
          variant="outlined"
          fullWidth
          onClick={() => navigate(link)}
          sx={{ mt: 'auto' }}
        >
          Access
        </Button>
      </CardContent>
    </Card>
  );
};

// Main dashboard component
export function RefactoredLawyerDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalClients: 0,
    totalDocuments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnectionError, setDbConnectionError] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [partialSuccess, setPartialSuccess] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Use the ID from the URL params if available, otherwise use the authenticated user's ID
  const lawyerId = id || user?.id;

  const fetchDashboardData = async (currentAttempt = 0) => {
    try {
      setLoading(true);
      setError(null);
      setDbConnectionError(false);
      setPartialSuccess(false);
      setDetailedError(null);
      setLastAttempt(new Date());
      setAttempt(currentAttempt);

      // Check authentication first
      if (!user) {
        const authCheckPromise = new Promise((resolve, reject) => {
          let checkCount = 0;
          const checkAuth = async () => {
            try {
              const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
              if (currentUser) {
                resolve(currentUser);
              } else if (checkCount < 3) {
                checkCount++;
                setTimeout(checkAuth, 1000);
              } else {
                reject(new Error("Authentication timeout"));
              }
            } catch (e) {
              reject(e);
            }
          };
          checkAuth();
        });

        await authCheckPromise;
      }

      // Fetch all required data in parallel with timeout
      const fetchWithTimeout = async () => {
        const timeout = new Promise((_, reject) => 
          // Extend timeout for slower connections
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );

        const fetchStats = async () => {
          try {
            // Initialize stats with default values
            let totalClients = 0;
            let totalDocuments = 0;
            let hasPartialData = false;

            // Fetch total clients
            try {
              const { data: clientsData, error: clientsError, count } = await supabase
                .from('lawyer_clients')
                .select('client_id', { count: 'exact' })
                .eq('lawyer_id', lawyerId);

              if (clientsError) {
                console.error('Error fetching clients:', clientsError);
                hasPartialData = true;
                setDetailedError(`Error fetching clients: ${clientsError.message}`);
              } else {
                totalClients = count || (clientsData?.length || 0);
              }
            } catch (clientError) {
              console.error('Client query failed:', clientError);
              hasPartialData = true;
              
              if (clientError instanceof Error && 
                 (clientError.message.includes('NetworkError') || 
                  clientError.message.includes('Failed to fetch'))) {
                setDbConnectionError(true);
              }
            }

            // Fetch total documents
            try {
              const { data: documentsData, error: documentsError, count } = await supabase
                .from('client_files')
                .select('id', { count: 'exact' })
                .eq('lawyer_id', lawyerId);

              if (documentsError) {
                console.error('Error fetching documents:', documentsError);
                hasPartialData = true;
              } else {
                totalDocuments = count || (documentsData?.length || 0);
              }
            } catch (docError) {
              console.error('Documents query failed:', docError);
              hasPartialData = true;
            }

            // For now, set cases to 0 until we implement the cases table
            const totalCases = 0;
            const activeCases = 0;

            // Set partial success if any query failed but we got some data
            if (hasPartialData) {
              setPartialSuccess(true);
            }

            return {
              totalClients,
              totalDocuments,
              totalCases,
              activeCases
            };
          } catch (error) {
            console.error('Error in fetchStats:', error);
            if (error instanceof Error) {
              setDetailedError(`Error fetching dashboard data: ${error.message}`);
              
              if (error.message.includes('NetworkError') || 
                  error.message.includes('Failed to fetch')) {
                setDbConnectionError(true);
              }
            }
            throw error;
          }
        };

        // Race the fetch against timeout
        return Promise.race([fetchStats(), timeout]);
      };

      try {
        const statsData = await fetchWithTimeout();
        setStats(statsData as DashboardStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        if (error instanceof Error) {
          if (error.message === 'Request timeout') {
            setError('Request timed out. Please check your connection and try again.');
          } else if (error.message.includes('NetworkError') || 
                    error.message.includes('Failed to fetch')) {
            setDbConnectionError(true);
            setDetailedError(`Network error: ${error.message}`);
          } else {
            setError(`Error loading dashboard data: ${error.message}`);
          }
        } else {
          setError('An unknown error occurred while loading dashboard data.');
        }
        
        // Partial success - we'll show what data we have even if some parts failed
        setPartialSuccess(true);
      }
    } catch (error) {
      console.error('Outer error:', error);
      
      // Add detailed error reporting
      if (error instanceof Error) {
        const errorMessage = error.message;
        setDetailedError(errorMessage);
        
        if (errorMessage.includes('Authentication timeout') || 
            errorMessage.includes('not authenticated')) {
          setError('Authentication failed. Please sign in again.');
          // Redirect to login after a slight delay
          setTimeout(() => navigate('/login'), 3000);
        } else if (errorMessage.includes('NetworkError') || 
                  errorMessage.includes('Failed to fetch')) {
          setDbConnectionError(true);
          setError('Network connection issue. Check your internet connection.');
        } else {
          setError(`Failed to load dashboard: ${errorMessage}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
      
      // Implement retry logic
      if (dbConnectionError && currentAttempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms (attempt ${currentAttempt + 1} of ${MAX_RETRIES})`);
        setTimeout(() => fetchDashboardData(currentAttempt + 1), RETRY_DELAY);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [id]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <Layout>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 'calc(100vh - 64px)' 
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading your dashboard{attempt > 0 ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : ''}...
            </Typography>
          </Box>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Enhanced Page Header with gradient background */}
      <PageHeader
        title="Lawyer Dashboard"
        subtitle="Manage your practice and access key information"
        gradient={true}
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => fetchDashboardData()}
            sx={{
              bgcolor: 'white',
              color: 'primary.dark',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            Refresh Data
          </Button>
        }
      />

      <Container maxWidth="xl" sx={{ py: 6 }}>
        {/* Error and warning alerts */}
        {dbConnectionError && (
          <Alert 
            severity="error" 
            sx={{ mb: 4 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => fetchDashboardData()}
              >
                Retry Now
              </Button>
            }
          >
            <AlertTitle>Connection Error</AlertTitle>
            Could not connect to the database. Please check your internet connection.
            {detailedError && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Error details: {detailedError}
              </Typography>
            )}
          </Alert>
        )}

        {partialSuccess && !dbConnectionError && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            <AlertTitle>Partial Data Loaded</AlertTitle>
            Some data couldn't be loaded. We're showing what we could retrieve.
          </Alert>
        )}

        {error && !dbConnectionError && (
          <Alert severity="error" sx={{ mb: 4 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Welcome Section */}
        <ContentCard sx={{ mb: 4, py: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Box 
              sx={{ 
                position: 'absolute', 
                top: -30, 
                left: -30, 
                width: '150px', 
                height: '150px', 
                bgcolor: 'primary.light', 
                opacity: 0.2, 
                borderRadius: '50%',
                filter: 'blur(40px)',
                zIndex: 0
              }} 
            />
            <Box sx={{ position: 'relative', zIndex: 1, p: 2 }}>
              <Typography 
                variant="h4" 
                component="h2" 
                fontWeight="bold"
                sx={{ 
                  mb: 1,
                  background: 'linear-gradient(45deg, #1976d2, #6d1e81)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textFillColor: 'transparent'
                }}
              >
                Welcome back, {user?.user_metadata?.name || user?.email || 'Counselor'}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Here's an overview of your legal practice's current status and key metrics.
              </Typography>
            </Box>
          </Box>
        </ContentCard>

        {/* Stats Grid */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3, 
          mb: 6 
        }}>
          <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
            <StatsCard
              title="Total Clients"
              value={stats.totalClients}
              icon={PeopleIcon}
              loading={loading}
            />
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
            <StatsCard
              title="Total Documents"
              value={stats.totalDocuments}
              icon={DescriptionIcon}
              loading={loading}
            />
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
            <StatsCard
              title="Total Cases"
              value={stats.totalCases}
              icon={WorkIcon}
              loading={loading}
            />
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
            <StatsCard
              title="Active Cases"
              value={stats.activeCases}
              icon={TimelineIcon}
              loading={loading}
            />
          </Box>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h5" 
            component="h2" 
            fontWeight="bold" 
            sx={{ mb: 3 }}
          >
            Legal Practice Tools
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 3 
          }}>
            {features.map((feature, index) => (
              <Box 
                key={feature.title}
                sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } }}
              >
                <FeatureCard {...feature} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Support Section */}
        <ContentCard 
          sx={{ mt: 6 }}
          title="Need Help?"
          subtitle="Our support team is ready to assist you with any questions."
          footerActions={
            <Button 
              variant="contained" 
              startIcon={<SupportAgentIcon />}
              onClick={() => navigate('/support')}
            >
              Contact Support
            </Button>
          }
        >
          <Typography variant="body1" paragraph>
            As a legal professional, we understand your time is valuable. If you're experiencing 
            any issues with the platform or need guidance on how to use specific features, 
            our dedicated support team is available to help.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Support hours: Monday to Friday, 9 AM - 5 PM
          </Typography>
        </ContentCard>
      </Container>
    </Layout>
  );
} 