import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { tokenTrackingService, TokenUsageStats } from '@/services/tokenTrackingService';
import { Loader2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from './ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import useAILawyerStore from '@/stores/aiLawyerStore';

interface TokenUsageDisplayProps {
  clientId: string;
  compact?: boolean;
  showResetButton?: boolean;
  className?: string;
}

/**
 * Component that displays token usage information for a client
 */
const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
  clientId,
  compact = false,
  showResetButton = false,
  className = '',
}) => {
  const [usageStats, setUsageStats] = useState<TokenUsageStats | null>(null);
  const [localUsage, setLocalUsage] = useState<{ total: number; cost: number }>({ total: 0, cost: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('current');
  const { toast } = useToast();
  const { updateTokenInfo } = useAILawyerStore();

  useEffect(() => {
    // Load local usage first (for immediate display)
    const local = tokenTrackingService.getLocalTokenUsage();
    setLocalUsage(local);
    
    // Update the store with token info
    updateTokenInfo({
      totalTokens: local.total,
      totalCost: local.cost
    });

    if (!compact) {
      // Only fetch detailed stats if not in compact mode
      fetchUsageStats();
    }
    
    // Set up interval to refresh local usage
    const interval = setInterval(() => {
      const refreshedLocal = tokenTrackingService.getLocalTokenUsage();
      setLocalUsage(refreshedLocal);
      updateTokenInfo({
        totalTokens: refreshedLocal.total,
        totalCost: refreshedLocal.cost
      });
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [clientId, compact, updateTokenInfo]);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await tokenTrackingService.getClientUsageStats(clientId);
      setUsageStats(stats);
    } catch (err) {
      setError('Error loading token usage statistics');
      console.error('Failed to load token usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    tokenTrackingService.resetLocalTokenUsage();
    setLocalUsage({ total: 0, cost: 0 });
    updateTokenInfo({ totalTokens: 0, totalCost: 0 });
    toast({
      title: 'Token counter reset',
      description: 'The session token counter has been reset to zero.',
    });
  };

  // Format a number as cost (USD)
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // If in compact mode, show a simplified version
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className="flex items-center">
          <span className="text-muted-foreground mr-1">Tokens:</span>
          <Badge variant="outline" className="font-mono">{formatNumber(localUsage.total)}</Badge>
        </div>
        <div className="flex items-center">
          <span className="text-muted-foreground mr-1">Cost:</span>
          <Badge variant="outline" className="font-mono">{formatCost(localUsage.cost)}</Badge>
        </div>
        {showResetButton && (
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-6 w-6" title="Reset counter">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v6h6"></path>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
            </svg>
          </Button>
        )}
      </div>
    );
  }

  // Data transformation for charts
  const modelChartData = usageStats
    ? Object.entries(usageStats.usageByModel).map(([model, data]) => ({
        name: model,
        tokens: data.tokens,
        cost: parseFloat(data.cost.toFixed(4)),
      }))
    : [];

  const serviceChartData = usageStats
    ? Object.entries(usageStats.usageByService).map(([service, data]) => ({
        name: service,
        tokens: data.tokens,
        cost: parseFloat(data.cost.toFixed(4)),
      }))
    : [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Token Usage</span>
          {showResetButton && (
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              Reset Session Counter
            </Button>
          )}
        </CardTitle>
        <CardDescription>Track AI token usage and associated costs</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Session</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="models">By Model</TabsTrigger>
            <TabsTrigger value="services">By Service</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Session Tokens</span>
                  <span className="text-sm font-mono">{formatNumber(localUsage.total)}</span>
                </div>
                <Progress value={Math.min(100, (localUsage.total / 10000) * 100)} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Session Cost</span>
                  <span className="text-sm font-mono">{formatCost(localUsage.cost)}</span>
                </div>
                <Progress value={Math.min(100, (localUsage.cost / 0.1) * 100)} className="h-2" />
              </div>
            </div>
            
            <div className="mt-4 rounded-md bg-muted p-3">
              <div className="flex items-center">
                <Info size={16} className="mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This counter reflects token usage in the current session only. For historical data, check the History tab.
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center p-4 text-destructive">
                <p>{error}</p>
                <Button onClick={fetchUsageStats} variant="outline" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Tokens</span>
                      <span className="text-sm font-mono">{usageStats ? formatNumber(usageStats.totalTokens) : 0}</span>
                    </div>
                    <Progress value={usageStats ? Math.min(100, (usageStats.totalTokens / 100000) * 100) : 0} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Cost</span>
                      <span className="text-sm font-mono">{usageStats ? formatCost(usageStats.totalCost) : '$0.0000'}</span>
                    </div>
                    <Progress value={usageStats ? Math.min(100, (usageStats.totalCost / 1) * 100) : 0} className="h-2" />
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Recent Usage</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Tokens</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {usageStats && usageStats.usageHistory.slice(0, 10).map((usage, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              {new Date(usage.timestamp).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">
                              {formatNumber(usage.totalTokens)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">
                              {formatCost(usage.cost)}
                            </td>
                          </tr>
                        ))}
                        {(!usageStats || usageStats.usageHistory.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-center text-sm text-muted-foreground">
                              No usage data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="models">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center p-4 text-destructive">
                <p>{error}</p>
                <Button onClick={fetchUsageStats} variant="outline" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          name === 'tokens' ? formatNumber(value) : formatCost(value),
                          name === 'tokens' ? 'Tokens' : 'Cost'
                        ]}
                      />
                      <Bar dataKey="tokens" name="Tokens" fill="#a5b4fc" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Cost by Model</h4>
                  <div className="border rounded-md divide-y divide-border">
                    {modelChartData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center px-3 py-2">
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-primary mr-2"></span>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs font-mono">{formatNumber(item.tokens)} tokens</span>
                          <span className="text-xs font-mono">{formatCost(item.cost)}</span>
                        </div>
                      </div>
                    ))}
                    {modelChartData.length === 0 && (
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                        No model usage data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="services">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center p-4 text-destructive">
                <p>{error}</p>
                <Button onClick={fetchUsageStats} variant="outline" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          name === 'tokens' ? formatNumber(value) : formatCost(value),
                          name === 'tokens' ? 'Tokens' : 'Cost'
                        ]}
                      />
                      <Bar dataKey="tokens" name="Tokens" fill="#d8b4fe" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Usage by Service</h4>
                  <div className="border rounded-md divide-y divide-border">
                    {serviceChartData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center px-3 py-2">
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-secondary mr-2"></span>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs font-mono">{formatNumber(item.tokens)} tokens</span>
                          <span className="text-xs font-mono">{formatCost(item.cost)}</span>
                        </div>
                      </div>
                    ))}
                    {serviceChartData.length === 0 && (
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                        No service usage data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="mr-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Token costs vary by model. Rates are updated regularly.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span>
            Token usage is calculated based on API responses and may not be 100% accurate.
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TokenUsageDisplay; 