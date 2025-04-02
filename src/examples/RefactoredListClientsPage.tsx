import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';
import { Client } from '@/types/client';
import { Plus, Search, Eye, Edit, Archive, MoreHorizontal } from 'lucide-react';

// Material-UI imports
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';

// Custom UI components
import PageHeader from '@/components/ui/PageHeader';
import ContentCard from '@/components/ui/ContentCard';

export function RefactoredListClientsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Clients' }
  ];

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setClients(data || []);
        setFilteredClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch clients"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.phone && client.phone.toLowerCase().includes(query))
    );

    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, clientId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedClientId(clientId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClientId(null);
  };

  const handleViewClient = () => {
    if (selectedClientId) {
      navigate(`/lawyer/clients/${selectedClientId}`);
    }
    handleMenuClose();
  };

  const handleEditClient = () => {
    if (selectedClientId) {
      navigate(`/lawyer/clients/${selectedClientId}/edit`);
    }
    handleMenuClose();
  };

  const handleArchiveClient = async () => {
    if (!selectedClientId) {
      handleMenuClose();
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'Archived' })
        .eq('id', selectedClientId);

      if (error) throw error;

      // Update the local state
      setClients(prevClients =>
        prevClients.map(client =>
          client.id === selectedClientId ? { ...client, status: 'Archived' } : client
        )
      );

      toast({
        title: "Success",
        description: "Client archived successfully"
      });
    } catch (error) {
      console.error('Error archiving client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive client"
      });
    }

    handleMenuClose();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Inactive':
        return 'error';
      case 'Archived':
        return 'default';
      case 'Pending':
        return 'warning';
      default:
        return 'primary';
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

  return (
    <Layout>
      {/* Enhanced page header with gradient background */}
      <PageHeader
        title="Client Management"
        subtitle="View, search, and manage your clients"
        gradient={true}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/lawyer/clients/new')}
            sx={{
              bgcolor: 'white',
              color: 'primary.dark',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            Add New Client
          </Button>
        }
        breadcrumbs={breadcrumbItems}
      />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <ContentCard>
          {/* Search and Filter Bar */}
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              placeholder="Search clients by name, email, or phone..."
              value={searchQuery}
              onChange={handleSearchChange}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: 'background.paper',
                }
              }}
            />
          </Box>

          {/* Client Table */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'primary.light' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchQuery.trim() !== '' ? 'No clients match your search criteria' : 'No clients found'}
                      </Typography>
                      {searchQuery.trim() !== '' && (
                        <Button
                          variant="text"
                          onClick={() => setSearchQuery('')}
                          sx={{ mt: 1 }}
                        >
                          Clear Search
                        </Button>
                      )}
                      {searchQuery.trim() === '' && clients.length === 0 && (
                        <Button
                          variant="contained"
                          startIcon={<Plus size={18} />}
                          onClick={() => navigate('/lawyer/clients/new')}
                          sx={{ mt: 2 }}
                        >
                          Add Your First Client
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell component="th" scope="row" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={client.photo_url || undefined} 
                          alt={`${client.first_name} ${client.last_name}`}
                          sx={{ 
                            width: 40, 
                            height: 40,
                            border: '2px solid white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        >
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {client.first_name} {client.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {client.client_id || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{client.email || 'Not provided'}</TableCell>
                      <TableCell>{client.phone || 'Not provided'}</TableCell>
                      <TableCell>
                        <Chip
                          label={client.status || 'Unknown'}
                          color={getStatusColor(client.status) as any}
                          size="small"
                          sx={{ fontWeight: 'medium' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="View client details">
                            <IconButton 
                              onClick={() => navigate(`/lawyer/clients/${client.id}`)}
                              color="primary"
                              size="small"
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit client">
                            <IconButton 
                              onClick={() => navigate(`/lawyer/clients/${client.id}/edit`)}
                              color="primary"
                              size="small"
                            >
                              <Edit size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="More options">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, client.id)}
                              color="primary"
                              size="small"
                            >
                              <MoreHorizontal size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination could be added here */}
        </ContentCard>
      </Container>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 2,
          sx: { 
            borderRadius: '8px',
            minWidth: '180px',
            mt: 1
          }
        }}
      >
        <MenuItem onClick={handleViewClient}>
          <Eye size={16} style={{ marginRight: '8px' }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEditClient}>
          <Edit size={16} style={{ marginRight: '8px' }} />
          Edit Client
        </MenuItem>
        <MenuItem onClick={handleArchiveClient} sx={{ color: 'error.main' }}>
          <Archive size={16} style={{ marginRight: '8px' }} />
          Archive Client
        </MenuItem>
      </Menu>
    </Layout>
  );
} 