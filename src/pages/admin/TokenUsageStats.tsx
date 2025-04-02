import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState as useZustandState } from '@/lib/zustand';
import { tokenTrackingService, TokenUsageStats } from '@/services/tokenTrackingService';
import TokenUsageDisplay from '@/components/TokenUsageDisplay';
import { handleError } from '@/utils/errorHandler';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function TokenUsageStatsPage() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [clientId, setClientId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [usageStats, setUsageStats] = useState<TokenUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<Array<{ value: string, label: string }>>([]);
  const [showingAllClients, setShowingAllClients] = useState<boolean>(false);
  const [tokenCosts, setTokenCosts] = useState<any[]>([]);
  const [isLoadingCosts, setIsLoadingCosts] = useState<boolean>(false);

  // Define breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Token Usage Statistics' }
  ];

  // Fetch the list of clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // This could be replaced with a call to your API to get clients
        const response = await fetch('/api/clients');
        if (!response.ok) throw new Error('Failed to fetch clients');
        
        const data = await response.json();
        const options = data.map((client: any) => ({
          value: client.id,
          label: client.name || client.email || client.id
        }));
        
        setClientOptions(options);
      } catch (error) {
        handleError(error, {
          title: 'Error fetching clients',
          defaultMessage: 'Could not load the client list'
        });
        
        // Set default user as option
        if (user) {
          setClientOptions([{
            value: user.id,
            label: user.user_metadata?.full_name || user.email || user.id
          }]);
          
          // Set current user as default client
          setClientId(user.id);
        }
      }
    };
    
    fetchClients();
  }, [user]);

  // Fetch token costs
  useEffect(() => {
    const fetchTokenCosts = async () => {
      setIsLoadingCosts(true);
      try {
        const costs = await tokenTrackingService.getTokenCostConfig();
        setTokenCosts(costs);
      } catch (error) {
        handleError(error, {
          title: 'Error loading token costs',
          defaultMessage: 'Failed to load token cost information'
        });
      } finally {
        setIsLoadingCosts(false);
      }
    };
    
    fetchTokenCosts();
  }, []);

  const fetchUsageStats = async () => {
    if (!clientId) {
      toast({
        title: 'No client selected',
        description: 'Please select a client to view their token usage',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await tokenTrackingService.getClientUsageStats(clientId, startDate, endDate);
      setUsageStats(stats);
    } catch (error) {
      handleError(error, {
        title: 'Error loading token usage',
        defaultMessage: 'Failed to load token usage statistics'
      });
      setError('Failed to load token usage statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const showAllClients = async () => {
    setIsLoading(true);
    setError(null);
    setShowingAllClients(true);
    
    try {
      // Implement logic to fetch aggregate stats for all clients
      // This would be a custom endpoint in your API
      const response = await fetch('/api/token-usage/aggregate');
      
      if (!response.ok) throw new Error('Failed to fetch aggregated token usage');
      
      const aggregateStats = await response.json();
      setUsageStats(aggregateStats);
    } catch (error) {
      handleError(error, {
        title: 'Error loading aggregated usage',
        defaultMessage: 'Failed to load token usage for all clients'
      });
      setError('Failed to load aggregated token usage');
      setShowingAllClients(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time-series data for charts
  const generateTimeSeriesData = () => {
    if (!usageStats?.usageHistory) return [];
    
    // Sort by timestamp ascending
    const sortedHistory = [...usageStats.usageHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Group by day
    const dailyData: Record<string, { date: string; tokens: number; cost: number }> = {};
    
    sortedHistory.forEach(record => {
      const date = format(new Date(record.timestamp), 'yyyy-MM-dd');
      
      if (!dailyData[date]) {
        dailyData[date] = { date, tokens: 0, cost: 0 };
      }
      
      dailyData[date].tokens += record.totalTokens;
      dailyData[date].cost += record.cost;
    });
    
    return Object.values(dailyData);
  };

  const timeSeriesData = generateTimeSeriesData();

  // Format functions
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  if (!isAdmin) {
    return (
      <Layout breadcrumbItems={breadcrumbItems}>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have administrator permissions to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Token Usage Statistics</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Client & Date Range</CardTitle>
            <CardDescription>View token usage statistics for a specific client or all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={clientId}
                  onValueChange={(value) => {
                    setClientId(value);
                    setShowingAllClients(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-end space-x-2">
                <Button 
                  onClick={fetchUsageStats} 
                  disabled={isLoading || !clientId}
                  className="flex-1"
                >
                  {isLoading ? 'Loading...' : 'View Usage'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={showAllClients}
                  disabled={isLoading}
                  className="flex-1"
                >
                  All Clients
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isLoadingCosts ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Token Costs</CardTitle>
              <CardDescription>Loading token cost information...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ) : tokenCosts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Token Costs</CardTitle>
              <CardDescription>Current rates for different models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Model Rates (per 1K tokens)</h3>
                  <div className="border rounded-md divide-y">
                    {tokenCosts.map((cost, index) => (
                      <div key={index} className="flex justify-between items-center p-2">
                        <div>
                          <span className="font-medium">{cost.model}</span>
                        </div>
                        <div className="space-x-4 text-sm">
                          <span>Input: ${cost.promptTokenRate.toFixed(5)}</span>
                          <span>Output: ${cost.completionTokenRate.toFixed(5)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Global Multiplier</h3>
                  <div className="border rounded-md p-4">
                    <div className="text-3xl font-bold mb-2">
                      {tokenCosts[0]?.globalMultiplier || 1.0}x
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All token costs are multiplied by this value. 
                      Change this in the token_costs table to adjust pricing globally.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[300px] w-full rounded-lg" />
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : usageStats ? (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>
                  {showingAllClients ? 'Aggregated Token Usage' : 'Client Token Usage'}
                </CardTitle>
                <CardDescription>
                  {showingAllClients 
                    ? 'Token usage across all clients' 
                    : `Token usage for selected client from ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatNumber(usageStats.totalTokens)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatCost(usageStats.totalCost)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Avg. Cost per 1K Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {usageStats.totalTokens > 0 
                          ? formatCost((usageStats.totalCost / usageStats.totalTokens) * 1000) 
                          : '$0.0000'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {usageStats.usageHistory.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Token Usage Over Time Chart */}
                {timeSeriesData.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Token Usage Over Time</h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" orientation="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip
                            formatter={(value: any, name: any) => {
                              if (name === 'tokens') return [formatNumber(value), 'Tokens'];
                              if (name === 'cost') return [formatCost(value), 'Cost'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="tokens" 
                            name="Tokens" 
                            stroke="#6366f1" 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="cost" 
                            name="Cost" 
                            stroke="#ec4899" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Usage By Model Chart */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Usage By Model</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={Object.entries(usageStats.usageByModel).map(([model, data]) => ({
                            name: model,
                            tokens: data.tokens,
                            cost: data.cost
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any, name: any) => {
                              if (name === 'tokens') return [formatNumber(value), 'Tokens'];
                              if (name === 'cost') return [formatCost(value), 'Cost'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="tokens" name="Tokens" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Usage By Service Chart */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Usage By Service</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={Object.entries(usageStats.usageByService).map(([service, data]) => ({
                            name: service,
                            tokens: data.tokens,
                            cost: data.cost
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any, name: any) => {
                              if (name === 'tokens') return [formatNumber(value), 'Tokens'];
                              if (name === 'cost') return [formatCost(value), 'Cost'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="tokens" name="Tokens" fill="#ec4899" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
                <p className="text-muted-foreground mb-6">
                  Select a client and date range to view token usage statistics
                </p>
                <Button variant="outline" onClick={() => {
                  if (clientId) fetchUsageStats();
                }} disabled={!clientId}>
                  View My Usage
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Full usage history table */}
        {usageStats && usageStats.usageHistory.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Detailed record of token usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Prompt Tokens</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Completion Tokens</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Total Tokens</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {usageStats.usageHistory.map((usage, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {format(new Date(usage.timestamp), 'PPp')}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {formatNumber(usage.promptTokens)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {formatNumber(usage.completionTokens)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {formatNumber(usage.totalTokens)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {formatCost(usage.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {usageStats.usageHistory.length} records
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                // Export as CSV
                const headers = ['Timestamp', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost'];
                const csvData = usageStats.usageHistory.map(usage => [
                  format(new Date(usage.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                  usage.promptTokens,
                  usage.completionTokens,
                  usage.totalTokens,
                  usage.cost.toFixed(6)
                ]);
                
                const csvContent = [
                  headers.join(','),
                  ...csvData.map(row => row.join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `token-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                Export CSV
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </Layout>
  );
} 