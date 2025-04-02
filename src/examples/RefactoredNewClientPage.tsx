import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Material-UI imports
import {
  Box,
  Container,
  TextField,
  Typography,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  PermIdentity as IdIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

// Custom UI components
import PageHeader from '@/components/ui/PageHeader';
import FormLayout from '@/components/ui/FormLayout';

export function RefactoredNewClientPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    status: 'Active',
    organization: '',
  });

  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Clients', href: '/lawyer/clients' },
    { label: 'New Client' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!formData.first_name || !formData.last_name) {
      setError('First name and last name are required.');
      setIsLoading(false);
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      // Generate a unique client ID (e.g., CL-YYYY-XXXX)
      const clientId = `CL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          id_number: formData.id_number || null,
          status: formData.status,
          organization: formData.organization || null,
          client_id: clientId,
          lawyer_id: user?.id, // Associate with current lawyer
        })
        .select();

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "New client created successfully"
      });

      // Navigate to the new client's page
      if (data && data[0]) {
        navigate(`/lawyer/clients/${data[0].id}`);
      } else {
        navigate('/lawyer/clients');
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      setError(error.message || 'Failed to create client. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleCancel = () => {
    navigate('/lawyer/clients');
  };

  return (
    <Layout>
      {/* Enhanced page header with gradient background */}
      <PageHeader
        title="Add New Client"
        subtitle="Create a new client profile"
        breadcrumbs={breadcrumbItems}
        gradient={true}
      />
      
      <Container maxWidth="md" sx={{ py: 6 }}>
        <FormLayout
          title="Client Information"
          subtitle="Enter the new client's details"
          submitText="Create Client"
          cancelText="Cancel"
          isLoading={isLoading}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          columns={2}
          spacing={3}
        >
          {/* Personal Information */}
          <TextField
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="client@example.com"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="+1 (555) 000-0000"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {/* ID and Organization */}
          <TextField
            label="ID Number"
            name="id_number"
            value={formData.id_number}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="Government ID or Passport"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IdIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Organization"
            name="organization"
            value={formData.organization}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="Company or Organization"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Status */}
          <TextField
            select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange as any}
            fullWidth
            variant="outlined"
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
          
          {/* Privacy Notice */}
          <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              By creating a client profile, you confirm that you have the client's permission to store their information 
              and that you have informed them about data processing in accordance with privacy regulations.
            </Typography>
          </Box>
        </FormLayout>
      </Container>
    </Layout>
  );
} 