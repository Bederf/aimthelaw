import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { FileSection } from '@/components/lawyer/FileSection';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { X, Mail, Phone, Building, User, Calendar, Loader2, Brain, CreditCard, FileText, Edit, Receipt, Clock, CalendarClock, CalendarCheck, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ClientFile, DocumentCategory } from '@/types/lawyer/client-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import axios from 'axios';
import { tokenTrackingService } from '@/services/tokenTrackingService';

// Add new interface for timeline data
interface TimelineEvent {
  date: string;
  event: string;
  sourceDocument?: string;
}

interface Timeline {
  past_events: TimelineEvent[];
  future_events: TimelineEvent[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  matter: string;
  created_at: string;
  status: string;
  phone_number?: string;
  company?: string;
}

export function ViewSingleClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);
  const [hasLoadingTimedOut, setHasLoadingTimedOut] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeline, setTimeline] = useState<Timeline>({
    past_events: [],
    future_events: []
  });
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [extractingDates, setExtractingDates] = useState(false);

  // Set a timeout in case loading takes too long
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setHasLoadingTimedOut(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Function to load client data
  const loadClient = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        throw new Error('Client not found');
      }
      
      setClientData(data as Client);
      
      // Also load files for this client
      await loadClientFiles(id);
      
    } catch (error) {
      console.error('Error loading client:', error);
      setError(error instanceof Error ? error : new Error('Failed to load client'));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load client data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  // Function to load client files with timeout protection
  const loadClientFiles = async (clientId: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      // Call the loadFiles function
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', clientId);
        
      clearTimeout(timeoutId);
      
      if (error) throw error;
      
      if (!data) {
        return;
      }
      
      // Verify files belong to this client (security check)
      const validFiles = data.filter(file => file.client_id === clientId);
      
      if (data.length !== validFiles.length) {
        console.warn(`Found ${data.length} files but only ${validFiles.length} match client_id ${clientId}`);
      }
      
      // Create ClientFile objects from raw data
      const processedFiles = validFiles.map(file => ({
        id: file.id?.toString() ?? '',
        file_name: file.file_name?.toString() ?? '',
        file_path: file.file_path?.toString() ?? '',
        file_type: file.file_type?.toString() ?? '',
        file_size: typeof file.file_size === 'number' ? file.file_size : 0,
        category: file.category?.toString(),
        created_at: file.created_at?.toString() ?? new Date().toISOString(),
        updated_at: file.updated_at?.toString() ?? new Date().toISOString(),
        lawyer_id: file.lawyer_id?.toString() ?? '',
        client_id: file.client_id?.toString() ?? '',
        status: file.status?.toString() ?? ''
      }));
      
      setFiles(processedFiles);
      
      // Also check for files still processing
      const processingIds = new Set(
        processedFiles
          .filter(file => file.status === 'uploading' || file.status === 'processing')
          .map(file => file.id)
      );
      
      setProcessingFiles(processingIds);
      
    } catch (error) {
      console.error('Error loading client files:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load client files. Please try again.'
      });
    }
  };

  const handleFileSelected = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleUploadComplete = (fileIds: string[]) => {
    // Reload files to get the new ones
    loadClientFiles(id!);
    
    // Add the uploaded files to processing
    setProcessingFiles(prev => {
      const newSet = new Set(prev);
      fileIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const handleFileDeleted = () => {
    // Reload client files after deletion
    loadClientFiles(id!);
  };

  const handleCategoryChange = (category: DocumentCategory | null) => {
    setSelectedCategory(category);
  };

  // New function to load timeline data
  const loadTimeline = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoadingTimeline(true);
      
      // First get all client files
      const { data: fileData, error: fileError } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', id);
        
      if (fileError) throw fileError;
      
      if (!fileData || fileData.length === 0) {
        // No files to extract dates from
        return;
      }
      
      // Get most recent date extraction results from database or API
      try {
        const timelineResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/client/${id}/timeline`);
        
        if (timelineResponse.data && timelineResponse.data.timeline) {
          setTimeline(timelineResponse.data.timeline);
        } else {
          // Add client creation as a default event if we don't have any other timeline data
          const clientCreationEvent = {
            date: clientData?.created_at ? format(new Date(clientData.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            event: "Client created in system"
          };
          
          setTimeline({
            past_events: [clientCreationEvent],
            future_events: []
          });
        }
      } catch (apiError) {
        console.error('Error loading timeline from API:', apiError);
        // Fallback: Just show client creation as a basic timeline
        const clientCreationEvent = {
          date: clientData?.created_at ? format(new Date(clientData.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          event: "Client created in system"
        };
        
        setTimeline({
          past_events: [clientCreationEvent],
          future_events: []
        });
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load timeline data. Please try again.'
      });
    } finally {
      setLoadingTimeline(false);
    }
  }, [id, clientData, toast]);

  // New function to extract dates from selected documents
  const extractDatesFromSelectedDocuments = async () => {
    if (!id || selectedFiles.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select one or more documents to extract dates from.",
        variant: "destructive"
      });
      return;
    }

    try {
      setExtractingDates(true);
      
      // Use the AI API to extract dates
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v2/ai/process`, 
        {
          client_id: id,
          documents: selectedFiles,
          action: "extract_dates",
          skip_training_data: true
        }
      );
      
      if (response.data && response.data.success) {
        // Track token usage for date extraction
        if (response.data.token_usage) {
          console.log('Date extraction token usage:', response.data.token_usage);
          
          // Record token usage
          await tokenTrackingService.recordTokenUsage({
            clientId: id,
            promptTokens: response.data.token_usage.prompt_tokens || 0,
            completionTokens: response.data.token_usage.completion_tokens || 0,
            model: response.data.token_usage.model || 'gpt-4',
            service: 'date_extraction',
            metadata: {
              document_count: selectedFiles.length,
              document_ids: selectedFiles,
              extracted_dates_count: response.data.dates?.length || 0
            }
          });
        } else {
          // If the API doesn't return token usage, estimate based on the number of files
          // This is a rough estimate
          const estimatedTokensPerFile = 2000; // Assume 2000 tokens per file
          const totalEstimatedTokens = selectedFiles.length * estimatedTokensPerFile;
          const promptTokens = Math.round(totalEstimatedTokens * 0.7); // 70% for input
          const completionTokens = Math.round(totalEstimatedTokens * 0.3); // 30% for output
          
          console.log(`Estimated date extraction token usage: ${totalEstimatedTokens} tokens`);
          
          // Record estimated token usage
          await tokenTrackingService.recordTokenUsage({
            clientId: id,
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            model: 'gpt-4', // Assume default model
            service: 'date_extraction',
            metadata: {
              document_count: selectedFiles.length,
              document_ids: selectedFiles,
              is_estimated: true
            }
          });
        }
        
        toast({
          title: "Date extraction complete",
          description: "Dates have been extracted from the selected documents."
        });
        
        // Refresh the timeline
        await loadTimeline();
      } else {
        throw new Error(response.data?.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error('Error extracting dates:', error);
      toast({
        title: "Date extraction failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setExtractingDates(false);
    }
  };

  // Load client data on component mount
  useEffect(() => {
    loadClient();
  }, [loadClient]);
  
  // Load timeline data when client data is loaded and tab is accessed
  useEffect(() => {
    if (clientData && activeTab === "chronology") {
      loadTimeline();
    }
  }, [clientData, activeTab, loadTimeline]);

  // Function to format the client status as a badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // If loading has timed out, show a message
  if (hasLoadingTimedOut) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Still Loading...</h1>
          <p className="text-muted-foreground mb-4">This is taking longer than expected. You can wait or try again.</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading client information...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <X className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error Loading Client</h1>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            <Button onClick={() => loadClient()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  // If we have client data but no client, they don't exist
  if (!clientData) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <X className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-semibold mb-2">Client Not Found</h1>
          <p className="text-muted-foreground mb-4">The client you are looking for does not exist or has been deleted.</p>
          <Button variant="outline" onClick={() => navigate('/lawyer/clients')}>View All Clients</Button>
        </div>
      </div>
    );
  }

  // Breadcrumb items
  const breadcrumbItems = [
    { href: '/lawyer', label: 'Dashboard' },
    { href: '/lawyer/clients', label: 'Clients' },
    { href: `/lawyer/clients/${id}`, label: clientData?.name || 'Client Details' },
  ];

  return (
    <div className="container py-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/lawyer/clients')}>Clients</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>{clientData?.name || 'Client'}</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <PageHeader heading={clientData?.name || 'Client'} text={clientData?.matter || 'No matter specified'} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/lawyer/clients/${id}/edit`)} size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Client
          </Button>
          <Button onClick={() => navigate(`/lawyer/ai-new/${id}`)} size="sm" variant="default">
            <Brain className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="chronology">Chronology</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Basic information about this client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-2">Name:</span>
                    <span>{clientData?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-2">Email:</span>
                    <span>{clientData?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-2">Phone:</span>
                    <span>{clientData?.phone_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-2">Company:</span>
                    <span>{clientData?.company || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-2">Created:</span>
                    <span>{clientData?.created_at ? format(new Date(clientData.created_at), 'MMMM d, yyyy') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground mr-2">Status:</span>
                    <span>{getStatusBadge(clientData?.status || '')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matter Summary</CardTitle>
                <CardDescription>Details about the legal matter</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{clientData?.matter || 'No matter details available.'}</p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/lawyer/ai-new/${id}`)}>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze with AI
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="documents">
          <FileSection
            clientId={id || ''}
            files={files}
            onFileSelected={handleFileSelected}
            selectedFiles={selectedFiles}
            onUploadComplete={handleUploadComplete}
            onCategoryChange={handleCategoryChange}
            selectedCategory={selectedCategory}
            processingFiles={processingFiles}
            onFileDeleted={handleFileDeleted}
          />
        </TabsContent>
        
        <TabsContent value="chronology">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Client Timeline
              </CardTitle>
              <CardDescription>
                Chronological timeline of important dates and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTimeline ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadTimeline}
                        disabled={loadingTimeline}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingTimeline ? 'animate-spin' : ''}`} />
                        Refresh Timeline
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={extractDatesFromSelectedDocuments}
                        disabled={extractingDates || selectedFiles.length === 0}
                      >
                        {extractingDates ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        Extract Dates from Selected Documents
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarCheck className="h-5 w-5 text-blue-500" />
                          Past Events
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {timeline.past_events.length === 0 ? (
                          <p className="text-muted-foreground italic">No past events found</p>
                        ) : (
                          <div className="space-y-4">
                            {timeline.past_events.map((event, index) => (
                              <div key={index} className="relative pl-6 pb-4 border-l border-muted">
                                <div className="absolute left-[-4px] top-1 h-2 w-2 rounded-full bg-blue-500"></div>
                                <p className="font-semibold">{format(new Date(event.date), 'MMMM d, yyyy')}</p>
                                <p>{event.event}</p>
                                {event.sourceDocument && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Source: {event.sourceDocument}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-amber-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarClock className="h-5 w-5 text-amber-500" />
                          Upcoming Deadlines & Events
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {timeline.future_events.length === 0 ? (
                          <p className="text-muted-foreground italic">No upcoming events found</p>
                        ) : (
                          <div className="space-y-4">
                            {timeline.future_events.map((event, index) => (
                              <div key={index} className="relative pl-6 pb-4 border-l border-muted">
                                <div className="absolute left-[-4px] top-1 h-2 w-2 rounded-full bg-amber-500"></div>
                                <p className="font-semibold">{format(new Date(event.date), 'MMMM d, yyyy')}</p>
                                <p>{event.event}</p>
                                {event.sourceDocument && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Source: {event.sourceDocument}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">
                      Tip: To add more dates to the timeline, select documents in the Documents tab and then click "Extract Dates from Selected Documents".
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>
                Payment details, invoices, and billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Billing Module Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  The billing module is currently under development. You'll soon be able to manage invoices, track payments, and handle billing for this client.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ViewSingleClientPage; 