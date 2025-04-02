import { useEffect, useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Settings, DollarSign, BarChart2, Palette, Briefcase, Zap, Activity, AlertTriangle, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/StatsCard';
import { toast } from 'sonner';

interface AdminStats {
  totalLawyers: number;
  totalClients: number;
  totalTokensUsed: number;
  systemHealth: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalLawyers: 0,
    totalClients: 0,
    totalTokensUsed: 0,
    systemHealth: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Dashboard' }
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[AdminDashboard] Fetching stats...');
        
        // Fetch lawyers count from profiles table with role = lawyer
        const { count: lawyersCount, error: lawyersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'lawyer');
          
        if (lawyersError) {
          console.error('[AdminDashboard] Error fetching lawyers:', lawyersError);
          throw lawyersError;
        }

        // Fetch clients count from profiles table with role = client
        const { count: clientsCount, error: clientsError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client');
          
        if (clientsError) {
          console.error('[AdminDashboard] Error fetching clients:', clientsError);
          throw clientsError;
        }

        // Fetch total tokens used from token_usage table
        const { data: tokenData, error: tokenError } = await supabase
          .from('token_usage')
          .select('total_tokens')
          .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          
        if (tokenError) {
          console.error('[AdminDashboard] Error fetching token usage:', tokenError);
          throw tokenError;
        }

        const totalTokens = tokenData?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;

        setStats({
          totalLawyers: lawyersCount || 0,
          totalClients: clientsCount || 0,
          totalTokensUsed: totalTokens,
          systemHealth: 100 // This could be calculated based on various metrics
        });

        console.log('[AdminDashboard] Stats fetched successfully:', {
          lawyers: lawyersCount,
          clients: clientsCount,
          tokens: totalTokens
        });

      } catch (error) {
        console.error('[AdminDashboard] Error in fetchStats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch dashboard statistics');
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout breadcrumbItems={breadcrumbItems}>
        <div className="container py-6">
          <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbItems={breadcrumbItems}>
        <div className="container py-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
            </div>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Retry
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Total Lawyers"
            value={stats.totalLawyers}
            icon={Briefcase}
            loading={loading}
          />
          <StatsCard
            title="Total Clients"
            value={stats.totalClients}
            icon={Users}
            loading={loading}
          />
          <StatsCard
            title="Tokens Used"
            value={stats.totalTokensUsed.toLocaleString()}
            icon={Zap}
            loading={loading}
          />
          <StatsCard
            title="System Health"
            value={`${stats.systemHealth}%`}
            icon={Activity}
            loading={loading}
          />
        </div>
        
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Lawyer Management</h2>
                <p className="text-sm text-muted-foreground">Manage lawyer accounts</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/lawyers">Manage Lawyers</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cost Management</h2>
                <p className="text-sm text-muted-foreground">Manage token costs and billing</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/costs">Manage Costs</Link>
            </Button>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Token Usage</h2>
                <p className="text-sm text-muted-foreground">Monitor token usage statistics</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/tokens">View Token Usage</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Analytics</h2>
                <p className="text-sm text-muted-foreground">View system analytics</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/analytics">View Analytics</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Theme Settings</h2>
                <p className="text-sm text-muted-foreground">Customize system appearance</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/theme">Manage Theme</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">System Settings</h2>
                <p className="text-sm text-muted-foreground">Configure system settings</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/admin/settings">Manage Settings</Link>
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 