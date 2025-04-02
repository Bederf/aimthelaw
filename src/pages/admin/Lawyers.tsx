import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';

interface Lawyer {
  id: string;
  lawyer_id: string;
  email: string;
  status: string;
  created_at: string;
  role: string;
}

export const LawyerDirectory = () => {
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const breadcrumbItems = [
    { label: 'Admin', link: '/admin/dashboard' },
    { label: 'Lawyers', link: '/admin/lawyers' },
  ];

  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLawyers(data || []);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
      toast.error('Failed to load lawyers');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveLawyer = async (lawyerId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'archived' })
        .eq('id', lawyerId);

      if (error) throw error;

      toast.success('Lawyer archived successfully');
      fetchLawyers();
    } catch (error) {
      console.error('Error archiving lawyer:', error);
      toast.error('Failed to archive lawyer');
    }
  };

  const handleActivateLawyer = async (lawyerId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', lawyerId);

      if (error) throw error;

      toast.success('Lawyer activated successfully');
      fetchLawyers();
    } catch (error) {
      console.error('Error activating lawyer:', error);
      toast.error('Failed to activate lawyer');
    }
  };

  const filteredLawyers = lawyers.filter(lawyer =>
    (lawyer?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto p-6">
        <PageHeader
          heading="Lawyer Directory"
          text="View and manage all lawyers in the system."
        >
          <Button onClick={() => navigate('/admin/lawyers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lawyer
          </Button>
        </PageHeader>

        <div className="mb-6">
          <Input
            type="search"
            placeholder="Search lawyers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </Card>
          ) : filteredLawyers.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                No lawyers found
              </div>
            </Card>
          ) : (
            filteredLawyers.map((lawyer) => (
              <Card key={lawyer.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{lawyer.email}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>ID: {lawyer.id}</span>
                      <span>•</span>
                      <span className="capitalize">Status: {lawyer.status}</span>
                      <span>•</span>
                      <span>
                        Joined: {new Date(lawyer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/admin/lawyers/${lawyer.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {lawyer.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleArchiveLawyer(lawyer.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-success hover:text-success"
                        onClick={() => handleActivateLawyer(lawyer.id)}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
