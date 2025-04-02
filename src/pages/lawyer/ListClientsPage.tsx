import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Eye,
  Pencil,
  Archive,
  Loader2,
  Users
} from 'lucide-react';
import { useClientList } from '@/hooks/lawyer/useClientList';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PageLayout } from '@/components/PageLayout';
import { PageSection } from '@/components/PageSection';

export function ListClientsPage() {
  const navigate = useNavigate();
  const { clients, isLoading, error } = useClientList();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Clients' }
  ];

  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (client.first_name?.toLowerCase()?.includes(searchLower) || '') ||
      (client.last_name?.toLowerCase()?.includes(searchLower) || '') ||
      (client.client_id?.toLowerCase()?.includes(searchLower) || '') ||
      client.email.toLowerCase().includes(searchQuery) ||
      (client.phone && client.phone.includes(searchQuery))
    );
  });

  const handleArchiveClient = async (clientId: string) => {
    try {
      // TODO: Implement archive functionality
      toast({
        title: "Client archived successfully"
      });
    } catch (err) {
      console.error('Error archiving client:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive client"
      });
    }
  };

  if (isLoading) {
    return (
      <PageLayout 
        title="Clients"
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout 
        title="Clients"
        breadcrumbItems={breadcrumbItems}
      >
        <PageSection variant="bordered">
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            <p>{error}</p>
          </div>
        </PageSection>
      </PageLayout>
    );
  }

  // Add button for page header
  const addButton = (
    <Button onClick={() => navigate('/lawyer/clients/new')}>
      <Plus className="h-4 w-4 mr-2" />
      New Client
    </Button>
  );

  return (
    <PageLayout 
      title="Clients"
      description="Manage your client list"
      breadcrumbItems={breadcrumbItems}
      action={addButton}
    >
      <PageSection icon={Users} variant="glass">
        <div className="border-b border-secondary/30 pb-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary/30 border-secondary"
              />
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Surname</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contact Number</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No clients found matching your search' : 'No clients added yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.client_id || 'N/A'}</TableCell>
                  <TableCell>{client.first_name || 'N/A'}</TableCell>
                  <TableCell>{client.last_name || 'N/A'}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || 'Not provided'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/lawyer/clients/${client.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/lawyer/clients/${client.id}/edit`)}
                        title="Edit Client"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchiveClient(client.id)}
                        title="Archive Client"
                        className="text-destructive hover:text-destructive"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </PageSection>
    </PageLayout>
  );
} 