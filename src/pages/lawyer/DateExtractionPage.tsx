import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, AlertCircle, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/components/Layout';
import { apiClient } from '@/api/apiClient';
import { CalendarIntegration } from '@/components/DateExtraction';

interface DateEvent {
  date: string;
  event: string;
  context: string;
  confidence: number;
}

interface TimelineYear {
  [month: string]: DateEvent[];
}

interface Timeline {
  [year: string]: TimelineYear;
}

export default function DateExtractionPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [extractedDates, setExtractedDates] = useState<DateEvent[]>([]);
  const [timeline, setTimeline] = useState<Timeline>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Fetch extracted dates from URL parameters or session storage
  useEffect(() => {
    // Check if we have dates in session storage
    const storedDates = sessionStorage.getItem(`extracted_dates_${clientId}`);
    if (storedDates) {
      try {
        const dates = JSON.parse(storedDates);
        setExtractedDates(dates);
        createTimeline(dates);
      } catch (error) {
        console.error('Error parsing stored dates:', error);
      }
    }
  }, [clientId]);

  // Create timeline from dates
  const createTimeline = (dates: DateEvent[]) => {
    const newTimeline: Timeline = {};
    
    dates.forEach((date: DateEvent) => {
      try {
        const dateObj = new Date(date.date);
        const year = dateObj.getFullYear().toString();
        const month = dateObj.toLocaleString('default', { month: 'long' });
        
        if (!newTimeline[year]) {
          newTimeline[year] = {};
        }
        
        if (!newTimeline[year][month]) {
          newTimeline[year][month] = [];
        }
        
        newTimeline[year][month].push(date);
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    });
    
    setTimeline(newTimeline);
  };

  const handleExportToCalendar = async () => {
    if (!extractedDates.length) {
      toast({
        variant: 'destructive',
        title: 'No dates to export',
        description: 'There are no dates available to export to calendar.'
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiClient.post('/calendar/events', {
        client_id: clientId,
        events: extractedDates
      });

      if (response.data && response.data.success) {
        setExportSuccess(true);
        toast({
          title: 'Calendar Export Successful',
          description: `Successfully added ${response.data.events_added} events to calendar`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: response.data?.message || 'Failed to export dates to calendar'
        });
      }
    } catch (error) {
      console.error('Error exporting dates to calendar:', error);
      toast({
        variant: 'destructive',
        title: 'Export Error',
        description: 'An error occurred while exporting dates to calendar'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/lawyer/clients/${clientId}`);
  };

  return (
    <Layout
      title="Date Extraction Results"
      breadcrumbItems={[
        { label: 'Clients', href: '/lawyer/clients' },
        { label: 'Client Details', href: `/lawyer/clients/${clientId}` },
        { label: 'Date Extraction' }
      ]}
    >
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center">
                    <Calendar className="mr-2 h-6 w-6" />
                    Extracted Dates
                  </CardTitle>
                  <CardDescription>
                    Review and export important dates from your documents
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGoBack}>
                    Back to Client
                  </Button>
                  <Button 
                    onClick={handleExportToCalendar} 
                    disabled={isExporting || !extractedDates.length}
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>Exporting...</>
                    ) : (
                      <>
                        <CalendarCheck className="h-4 w-4" />
                        Export to Calendar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {exportSuccess && (
                <Alert className="mb-6 bg-success/20 border-success">
                  <CalendarCheck className="h-4 w-4" />
                  <AlertTitle>Export Successful</AlertTitle>
                  <AlertDescription>
                    The dates have been successfully exported to your calendar.
                  </AlertDescription>
                </Alert>
              )}
              
              {extractedDates.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No dates found</AlertTitle>
                  <AlertDescription>
                    No dates were extracted or the extraction process hasn't been completed yet.
                    Return to the client page and use the "Extract Dates" quick action on your documents.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-8">
                  <h3 className="text-lg font-medium">Timeline</h3>
                  {Object.entries(timeline)
                    .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
                    .map(([year, months]) => (
                      <div key={year} className="space-y-4">
                        <h3 className="text-xl font-bold sticky top-0 bg-background py-2 z-10">
                          {year}
                        </h3>
                        
                        {Object.entries(months).map(([month, events]) => (
                          <div key={`${year}-${month}`} className="space-y-2">
                            <h4 className="text-lg font-semibold text-primary">
                              {month}
                            </h4>
                            
                            <div className="space-y-2">
                              {events
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((event, index) => (
                                  <Card key={`${event.date}-${index}`}>
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                          <p className="font-medium">{event.event}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {event.context}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold">
                                            {new Date(event.date).toLocaleDateString()}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Confidence: {Math.round(event.confidence * 100)}%
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 