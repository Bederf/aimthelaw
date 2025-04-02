import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, Receipt, Zap, DollarSign, 
  BarChart, Clock, CalendarRange, FileText 
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { tokenTrackingService } from '@/services/tokenTrackingService';
import { tokenService } from '@/services/tokenService';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';

// Format a number as cost (ZAR)
const formatCost = (cost: number) => {
  return `R ${cost.toFixed(4)}`;
};

// Format large numbers with commas
const formatNumber = (num: number) => {
  return num.toLocaleString();
};

export function ClientBillingPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tokenRate, setTokenRate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date()
  });
  const [detailedHistory, setDetailedHistory] = useState<any[]>([]);
  
  const [usageData, setUsageData] = useState<{
    total_tokens: number;
    total_cost: number;
    usage_by_model: Record<string, { tokens: number; cost: number }>;
    usage_by_service: Record<string, { tokens: number; cost: number }>;
  }>({
    total_tokens: 0,
    total_cost: 0,
    usage_by_model: {},
    usage_by_service: {}
  });

  // Only construct breadcrumb items when user is available
  const breadcrumbItems = user ? [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user.id}` },
    { label: 'Clients', href: '/lawyer/clients' },
    { label: 'Client Details', href: `/lawyer/clients/${clientId}` },
    { label: 'Token Usage & Billing' }
  ] : [];

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  useEffect(() => {
    const loadBillingData = async () => {
      if (!clientId) return;

      try {
        setLoading(true);

        // Get current token rate
        const tokenCost = await billingService.getTokenCost();
        setTokenRate(tokenCost.rate);

        // Get token usage statistics for the date range
        const usage = await billingService.getClientUsageByDateRange(
          clientId,
          dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          dateRange?.to || new Date()
        );

        setUsageData(usage);
        
        // Get detailed usage history
        const history = await tokenService.getUsageHistory(clientId);
        setDetailedHistory(history);
        
      } catch (error) {
        console.error('Error loading billing data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load billing data"
        });
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, [clientId, toast, dateRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  if (loading) {
    return (
      <Layout breadcrumbItems={breadcrumbItems}>
        <div className="container py-8">
          <div className="space-y-4">
            <div className="h-32 animate-pulse bg-secondary/50 rounded-lg"></div>
            <div className="h-64 animate-pulse bg-secondary/50 rounded-lg"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/lawyer/clients/${clientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>

          <div className="flex items-center space-x-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <DateRangePicker 
              value={dateRange}
              onValueChange={handleDateRangeChange}
            />
          </div>
        </div>

        <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="services">Services Breakdown</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(usageData.total_tokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    Current rate: {formatCost(tokenRate)} per 1K tokens
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCost(usageData.total_cost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total usage charges
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Model Usage</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(usageData.usage_by_model).map(([model, data]) => (
                      <div key={model} className="flex justify-between text-sm">
                        <span>{model}:</span>
                        <span>{formatNumber(data.tokens)} tokens</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Service</CardTitle>
                <CardDescription>Breakdown of token usage by different AI services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(usageData.usage_by_service).map(([service, data]) => (
                    <div key={service} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium capitalize">{service.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(data.tokens)} tokens used
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCost(data.cost)}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((data.tokens / usageData.total_tokens) * 100)}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                  {Object.keys(usageData.usage_by_service).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No service usage data available for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="services">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Processing</CardTitle>
                  <CardDescription>Token usage for processing documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedHistory
                        .filter(item => item.service === 'document_processing')
                        .slice(0, 5)
                        .map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {item.metadata?.file_name || item.metadata?.document_id || 'Unknown'}
                            </TableCell>
                            <TableCell>{item.model}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.total_tokens)}</TableCell>
                            <TableCell className="text-right">{formatCost(item.cost)}</TableCell>
                          </TableRow>
                        ))}
                      {detailedHistory.filter(item => item.service === 'document_processing').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No document processing usage found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>AI Chat</CardTitle>
                  <CardDescription>Token usage for AI chat interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead>Conversation</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedHistory
                        .filter(item => item.service === 'chat')
                        .slice(0, 5)
                        .map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {item.metadata?.conversation_id ? 
                                item.metadata.conversation_id.substring(0, 8) + '...' : 
                                'Conversation'}
                            </TableCell>
                            <TableCell>{item.model}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.total_tokens)}</TableCell>
                            <TableCell className="text-right">{formatCost(item.cost)}</TableCell>
                          </TableRow>
                        ))}
                      {detailedHistory.filter(item => item.service === 'chat').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No chat usage found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Other Services</CardTitle>
                  <CardDescription>Token usage for other AI services</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedHistory
                        .filter(item => item.service !== 'chat' && item.service !== 'document_processing')
                        .slice(0, 5)
                        .map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="capitalize">
                              {item.service.replace('_', ' ')}
                            </TableCell>
                            <TableCell>{item.model}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.total_tokens)}</TableCell>
                            <TableCell className="text-right">{formatCost(item.cost)}</TableCell>
                          </TableRow>
                        ))}
                      {detailedHistory.filter(item => item.service !== 'chat' && item.service !== 'document_processing').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No other service usage found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Detailed history of all token usage transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Prompt Tokens</TableHead>
                        <TableHead className="text-right">Completion Tokens</TableHead>
                        <TableHead className="text-right">Total Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedHistory.slice(0, 20).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {new Date(item.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.service.replace('_', ' ')}
                          </TableCell>
                          <TableCell>{item.model}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.prompt_tokens)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.completion_tokens)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.total_tokens)}</TableCell>
                          <TableCell className="text-right">{formatCost(item.cost)}</TableCell>
                        </TableRow>
                      ))}
                      {detailedHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                            No transaction history found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
} 