import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Info, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { billingService, type TokenCost } from '@/services/billingService';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/ui/use-toast';

export function AdminCostManagementPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newRate, setNewRate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Cost Management' }
  ];

  const { data: tokenCost, isLoading, isError, error } = useQuery<TokenCost>({
    queryKey: ['tokenCost'],
    queryFn: async () => {
      try {
        const data = await billingService.getTokenCost();
        if (!data || !data.rate) {
          throw new Error('Invalid token cost data received');
        }
        return data;
      } catch (err) {
        console.error('Token cost fetch error:', err);
        throw new Error('Failed to fetch token cost. Please check your connection and try again.');
      }
    },
    retry: (failureCount, error) => {
      if (error.message.includes('Invalid token cost data')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  const handleUpdateRate = async () => {
    if (!newRate || isNaN(parseFloat(newRate))) {
      toast({
        variant: "destructive",
        title: "Invalid rate",
        description: "Please enter a valid number for the token rate"
      });
      return;
    }

    try {
      setIsUpdating(true);
      await billingService.updateTokenCost(parseFloat(newRate));
      
      toast({
        title: "Success",
        description: "Token rate updated successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['tokenCost'] });
      setNewRate('');
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update token rate"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <PageHeader
        title="Cost Management"
        description="Monitor and manage system-wide token costs"
        action={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tokenCost'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="container py-6">
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Current Token Cost</h2>
                <p className="text-sm text-muted-foreground">
                  Cost per token for AI services
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error?.message || 'Failed to load token cost'}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">R{tokenCost?.rate.toFixed(6)}</span>
                    <span className="text-sm text-muted-foreground">per token</span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Last updated: {new Date(tokenCost?.updated_at || '').toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="new-rate">Update Token Rate</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">R</span>
                      <Input
                        id="new-rate"
                        type="number"
                        step="0.000001"
                        min="0"
                        placeholder="Enter new rate"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <Button onClick={handleUpdateRate} disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Rate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">About Token Costs</h2>
                <p className="text-sm text-muted-foreground">Understanding token pricing</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Tokens are the basic unit of text processing in our AI system. The token rate 
                determines the cost of using AI services such as document analysis, legal research, 
                and automated drafting.
              </p>
              <p>
                Token rates are set by system administrators and apply to all AI service usage. 
                You can monitor token usage and associated costs for each lawyer in their 
                respective billing sections.
              </p>
              <p>
                For detailed token usage analytics and cost breakdowns, visit the Analytics page.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 