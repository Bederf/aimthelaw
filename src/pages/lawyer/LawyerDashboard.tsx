import React, { useEffect, useState } from 'react';scree
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBreadcrumbUpdate } from '@/hooks/useBreadcrumbUpdate';

// Material-UI imports
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  CircularProgress
} from '@mui/material';

// Icons
import {
  Briefcase,
  Users,
  FileText,
  Activity,
  Calculator,
  Bot,
  DollarSign,
  Calendar
} from 'lucide-react';

// Interface definitions
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalClients: number;
  totalDocuments: number;
}

// StatsCard component for displaying metrics
const StatsCard = ({ title, value, icon: Icon, loading }) => {
  return (
    <Card elevation={3} sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 3 }}>
        <Box 
          sx={{ 
            color: 'primary.main',
  display: 'flex',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Icon size={24} />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={24} sx={{ alignSelf: 'center', my: 1 }} />
        ) : (
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// FeatureCard component for dashboard features
const FeatureCard = ({ title, description, icon: Icon, link, isNew = false }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      elevation={1} 
      sx={{ 
        height: '100%',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
        }
      }}
    >
      {isNew && (
        <Box 
          sx={{ 
    position: 'absolute',
    top: 0,
    right: 0,
            bgcolor: 'success.main',
            color: 'white',
            px: 1,
            py: 0.5,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '0 4px 0 4px'
          }}
        >
          NEW
        </Box>
      )}
      <CardContent>
        <Box sx={{ mb: 2, color: 'primary.main' }}>
          <Icon size={32} />
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate(link)}
          fullWidth
        >
          Access
        </Button>
      </CardActions>
    </Card>
  );
};

export function LawyerDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Set up breadcrumbs
  const breadcrumbs = [{ label: 'Dashboard' }];
  useBreadcrumbUpdate(breadcrumbs);

  // Stats state
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalClients: 0,
    totalDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  // Features configuration
  const features = [
    {
      title: 'Client Management',
      description: 'View, add, and manage all your clients in one place.',
      icon: Users,
      link: '/lawyer/clients',
    },
    {
      title: 'Document Manager',
      description: 'Organize and access all your legal documents securely.',
      icon: FileText,
      link: '/lawyer/documents',
    },
    {
      title: 'Cases Overview',
      description: 'Track progress on your active and pending cases.',
      icon: Activity,
      link: '/lawyer/cases',
    },
    {
      title: 'AI Legal Assistant',
      description: 'Get AI-powered assistance for legal research and document analysis.',
      icon: Bot,
      link: '/lawyer/ai',
      isNew: true,
    },
    {
      title: 'Cost Management',
      description: 'Manage and track your client billing and expenses.',
      icon: DollarSign,
      link: '/lawyer/costs',
    },
    {
      title: 'Maintenance Calculator',
      description: 'Calculate maintenance payments with our specialized tool.',
      icon: Calculator,
      link: '/lawyer/maintenance',
    },
    {
      title: 'Date Extraction',
      description: 'Automatically extract important dates from legal documents.',
      icon: Calendar,
      link: id ? `/lawyer/clients/${id}/dates` : '/lawyer/clients',
    },
    {
      title: 'Case Management',
      description: 'Comprehensive tools for managing your legal cases.',
      icon: Briefcase,
      link: '/lawyer/cases',
    },
  ];

  // Fetch dashboard data
  const fetchDashboardData = async (currentAttempt = 0) => {
    setLoading(true);
    try {
      // Check that we have a valid ID before proceeding
      if (!id) {
        console.error('No user ID provided for dashboard');
        return;
      }

      // Verify user is authenticated
          const checkAuth = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session !== null;
      };

      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        console.error('User is not authenticated');
        navigate('/login');
        return;
      }

      // Fetch data with a timeout to prevent infinite loading
      const fetchWithTimeout = async () => {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        );

        const fetchStats = async () => {
          const [clientsResponse, documentsResponse] = await Promise.all([
            supabase.from('clients').select('*').eq('lawyer_id', id),
            supabase.from('documents').select('*').eq('user_id', id)
          ]);

          const totalClients = clientsResponse.data?.length || 0;
          const totalDocuments = documentsResponse.data?.length || 0;

          setStats({
            totalCases: 0, // Placeholder, would need an actual cases table
            activeCases: 0, // Placeholder
              totalClients,
            totalDocuments
          });
        };

        return Promise.race([fetchStats(), timeout]);
      };

      await fetchWithTimeout();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
      // Retry logic for network errors
      if (currentAttempt < 3) {
        console.log(`Retrying dashboard data fetch (attempt ${currentAttempt + 1})`);
        setTimeout(() => fetchDashboardData(currentAttempt + 1), 1000);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [id]);

  return (
    <Layout breadcrumbItems={breadcrumbs}>
      {/* Main container with a lighter background color */}
      <Box
        sx={{
          py: 6,
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)', // Account for header height
        }}
      >
        <Container maxWidth="lg">
          {/* Page Title and Intro */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight="bold">
              Welcome back, {user?.email || 'Lawyer'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's an overview of your legal practice's current status and key metrics.
            </Typography>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Clients"
              value={stats.totalClients}
              icon={Users}
              loading={loading}
            />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Documents"
              value={stats.totalDocuments}
              icon={FileText}
              loading={loading}
            />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard 
                title="Total Cases" 
                value={stats.totalCases} 
                icon={Briefcase} 
                loading={loading} 
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard 
                title="Active Cases" 
                value={stats.activeCases} 
                icon={Activity} 
                loading={loading} 
              />
            </Grid>
          </Grid>

          {/* Features / Tools Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Legal Practice Tools
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Access and manage all your legal information in one place.
            </Typography>
            <Grid container spacing={3}>
              {features.map((feature) => (
                <Grid item xs={12} sm={6} md={3} key={feature.title}>
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    link={feature.link}
                    isNew={feature.isNew}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
} 