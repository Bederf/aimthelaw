import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  Activity,
  Settings,
  Palette,
  BarChart2,
  Briefcase,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import FeatureCard from '@/components/FeatureCard';

interface AdminStats {
  totalLawyers: number;
  totalClients: number;
  totalTokensUsed: number;
  systemHealth: number;
}

const features = [
  {
    title: "Lawyer Directory",
    description: "View and manage lawyer accounts",
    icon: Briefcase,
    link: "/admin/lawyers"
  },
  {
    title: "Theme Settings",
    description: "Customize system appearance",
    icon: Palette,
    link: "/admin/theme"
  },
  {
    title: "Cost Management",
    description: "Monitor system costs and usage",
    icon: DollarSign,
    link: "/admin/costs"
  },
  {
    title: "Analytics",
    description: "View system analytics and reports",
    icon: BarChart2,
    link: "/admin/analytics"
  },
  {
    title: "System Settings",
    description: "Configure system parameters",
    icon: Settings,
    link: "/admin/settings"
  }
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalLawyers: 0,
    totalClients: 0,
    totalTokensUsed: 0,
    systemHealth: 100
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Dashboard' }
  ];

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!user) return;

      try {
        setDashboardLoading(true);
        setError(null);

        // Fetch stats from Supabase
        const [lawyersResult, clientsResult] = await Promise.all([
          supabase
            .from('lawyers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
        ]);

        if (lawyersResult.error || clientsResult.error) {
          throw new Error('Failed to fetch data');
        }

        setStats({
          totalLawyers: lawyersResult.count || 0,
          totalClients: clientsResult.count || 0,
          totalTokensUsed: 0, // To be implemented with token tracking
          systemHealth: 100 // Placeholder for actual health metric
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchAdminStats();
  }, [user]);

  if (isLoading || dashboardLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-2xl font-bold text-destructive mb-4">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <main className="flex-1 container py-20">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Welcome back!</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your AI legal system today.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Lawyers"
              value={stats.totalLawyers}
              icon={Briefcase}
            />
            <StatsCard
              title="Total Clients"
              value={stats.totalClients}
              icon={Users}
            />
            <StatsCard
              title="Tokens Used"
              value={stats.totalTokensUsed.toLocaleString()}
              icon={Zap}
            />
            <StatsCard
              title="System Health"
              value={`${stats.systemHealth}%`}
              icon={Activity}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.link}
                {...feature}
              />
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
