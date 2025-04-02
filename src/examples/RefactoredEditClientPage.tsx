import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';
import { Client } from '@/types/client';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import imageCompression from 'browser-image-compression';

// Material-UI imports for enhanced styling
import {
  Box,
  Container,
  Grid,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
  Paper,
  Divider,
  Stack,
} from '@mui/material';

// Use our new components
import PageHeader from '@/components/ui/PageHeader';
import ContentCard from '@/components/ui/ContentCard';

export function RefactoredEditClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    status: '',
    id_number: ''
  });

  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Clients', href: '/lawyer/clients' },
    { label: client ? `${client.first_name} ${client.last_name}` : 'Client', href: `/lawyer/clients/${id}` },
    { label: 'Edit Client' }
  ];

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;

      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (clientData) {
          setClient(clientData);
          setFormData({
            email: clientData.email || '',
            phone: clientData.phone || '',
            status: clientData.status || '',
            id_number: clientData.id_number || ''
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch client details"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    try {
      setUploading(true);

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024
      });

      const fileName = `${client.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('clients')
        .update({ photo_url: publicUrlData.publicUrl })
        .eq('id', client.id);

      if (updateError) throw updateError;

      setClient(prev => prev ? { ...prev, photo_url: publicUrlData.publicUrl } : null);

      toast({
        title: "Success",
        description: "Profile photo updated successfully"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload profile photo"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          id_number: formData.id_number
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client details updated successfully"
      });

      navigate(`/lawyer/clients/${client.id}`);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update client details"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 4rem)' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <PageHeader
          title="Client Not Found"
          subtitle="We couldn't find the client you're looking for."
          breadcrumbs={breadcrumbItems}
        />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            onClick={() => navigate('/lawyer/clients')}
            sx={{ mt: 2 }}
          >
            Return to Clients
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Enhanced PageHeader with gradient background */}
      <PageHeader
        title={`Edit ${client.first_name} ${client.last_name}`}
        subtitle="Update client information and profile photo"
        breadcrumbs={breadcrumbItems}
        gradient={true}
        actions={
          <Button 
            variant="contained" 
            color="secondary"
            onClick={() => navigate(`/lawyer/clients/${client.id}`)}
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.dark',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            View Client Profile
          </Button>
        }
      />
      
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Client Photo Card */}
          <Grid item xs={12} md={4}>
            <ContentCard
              title="Profile Photo"
              subtitle="Upload a professional photo"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                <Avatar
                  src={client.photo_url || undefined}
                  alt={`${client.first_name} ${client.last_name}`}
                  sx={{ 
                    width: 150, 
                    height: 150,
                    mb: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '4px solid white'
                  }}
                />
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  id="photo-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    disabled={uploading}
                    startIcon={<Upload />}
                    sx={{ mt: 2 }}
                  >
                    {uploading ? 'Uploading...' : 'Upload New Photo'}
                  </Button>
                </label>
              </Box>
            </ContentCard>
            
            {/* Client Status Card */}
            <ContentCard
              title="Client Status"
              subtitle="Information about the client's account"
              sx={{ mt: 4 }}
            >
              <Stack spacing={2} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Client ID</Typography>
                  <Typography variant="body1" fontWeight="medium">{client.client_id || 'Not Assigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Typography variant="body1" fontWeight="medium" sx={{ 
                    color: client.status === 'Active' ? 'success.main' : 
                            client.status === 'Inactive' ? 'error.main' : 'warning.main'
                  }}>
                    {client.status || 'Not Set'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Created On</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Box>
              </Stack>
            </ContentCard>
          </Grid>
          
          {/* Client Details Form */}
          <Grid item xs={12} md={8}>
            <ContentCard
              title="Client Information"
              subtitle="Edit contact details and identification"
              footerActions={
                <>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate(`/lawyer/clients/${client.id}`)}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained"
                    onClick={handleSubmit}
                    color="primary"
                  >
                    Save Changes
                  </Button>
                </>
              }
            >
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Full Name
                    </Typography>
                    <TextField
                      fullWidth
                      disabled
                      value={`${client.first_name || ''} ${client.last_name || ''}`}
                      helperText="Client name cannot be changed here"
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Email Address
                    </Typography>
                    <TextField
                      fullWidth
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      variant="outlined"
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Phone Number
                    </Typography>
                    <TextField
                      fullWidth
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      ID Number
                    </Typography>
                    <TextField
                      fullWidth
                      name="id_number"
                      value={formData.id_number}
                      onChange={handleInputChange}
                      placeholder="Government ID Number"
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Status
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange as any}
                      SelectProps={{
                        native: true,
                      }}
                      variant="outlined"
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </TextField>
                  </Grid>
                </Grid>
              </form>
            </ContentCard>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
} 