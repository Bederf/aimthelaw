import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart2, Users, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalTokensUsed: number;
  totalDocumentsAnalyzed: number;
  averageResponseTime: number;
  activeUsers: number;
}

export function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTokensUsed: 0,
    totalDocumentsAnalyzed: 0,
    averageResponseTime: 0,
    activeUsers: 0,
  });

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Analytics' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch total tokens used
      const { data: tokenData, error: tokenError } = await supabase
        .from('token_usage')
        .select('tokens')
        .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (tokenError) throw new Error('Failed to fetch token usage');

      // Fetch active users (lawyers and clients who have logged in in the last 30 days)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .gt('last_sign_in', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (userError) throw new Error('Failed to fetch user data');

      // Calculate analytics
      const totalTokens = tokenData.reduce((sum, record) => sum + record.tokens, 0);
      
      setAnalytics({
        totalTokensUsed: totalTokens,
        totalDocumentsAnalyzed: Math.floor(totalTokens / 1000), // Rough estimate
        averageResponseTime: 2.5, // Placeholder - implement actual calculation
        activeUsers: userData.length,
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">System Analytics</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTokensUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Analyzed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDocumentsAnalyzed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Estimated from token usage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageResponseTime}s</div>
              <p className="text-xs text-muted-foreground">API response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 