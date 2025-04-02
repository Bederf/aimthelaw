import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCircle, Search, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

interface ClientSelectionPageProps {
  title: string;
  description: string;
  redirectPath: string;
}

export function ClientSelectionPage({ title, description, redirectPath }: ClientSelectionPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(client => 
        client.first_name.toLowerCase().includes(query) || 
        client.last_name.toLowerCase().includes(query) || 
        client.email.toLowerCase().includes(query)
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);
  
  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Get lawyer ID
      const lawyerId = user?.id;
      if (!lawyerId) return;
      
      // Fetch clients associated with the lawyer
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('lawyer_id', lawyerId);
      
      if (error) throw error;
      
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load clients. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClientSelect = (clientId: string) => {
    // Replace :clientId in the redirect path with the actual client ID
    const path = redirectPath.replace(':clientId', clientId);
    navigate(path);
  };
  
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/lawyer/dashboard' },
    { label: title }
  ];
  
  return (
    <Layout title={title} breadcrumbItems={breadcrumbItems}>
      <div className="container py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search clients..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Card className="border-dashed border-2 border-primary/50 hover:border-primary hover:shadow-md transition-all">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-10 w-10 text-primary" />
                    <div>
                      <h3 className="font-medium">Use without client</h3>
                      <p className="text-sm text-muted-foreground">
                        For general research or personal use
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => user && handleClientSelect(user.id)}
                    className="flex items-center"
                  >
                    Select
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-10 w-10 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {client.first_name} {client.last_name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {client.email}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleClientSelect(client.id)}
                    className="flex items-center"
                  >
                    Select
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-8">
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No clients found matching your search.' : 'No clients found. Add clients to get started.'}
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
} 