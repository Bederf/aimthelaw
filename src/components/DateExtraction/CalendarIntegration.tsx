import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, CalendarCheck, CalendarX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api-client';

interface CalendarIntegrationProps {
  clientId: string;
  documentIds: string[];
  extractedDates?: any[];
  onCalendarSuccess?: (result: any) => void;
}

export function CalendarIntegration({
  clientId,
  documentIds,
  extractedDates,
  onCalendarSuccess
}: CalendarIntegrationProps) {
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarResult, setCalendarResult] = useState<any>(null);
  const { toast } = useToast();

  const handleExtractWithCalendar = async () => {
    if (!clientId || !documentIds.length) {
      toast({
        title: "Missing information",
        description: "Client ID and document IDs are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/extract-dates', {
        client_id: clientId,
        document_ids: documentIds,
        add_to_calendar: addToCalendar
      });

      if (response.data) {
        setCalendarResult(response.data.calendar_results);
        
        if (onCalendarSuccess) {
          onCalendarSuccess(response.data);
        }

        // Show success toast
        const totalAdded = Object.values(response.data.calendar_results || {}).reduce(
          (sum: number, result: any) => sum + (result?.events_added || 0), 
          0
        );

        toast({
          title: "Calendar Integration",
          description: `Successfully added ${totalAdded} events to calendar`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error extracting dates with calendar integration:", error);
      toast({
        title: "Calendar Error",
        description: "Failed to add events to calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExistingDatesToCalendar = async () => {
    if (!clientId || !extractedDates || !extractedDates.length) {
      toast({
        title: "Missing information",
        description: "No dates available to add to calendar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/calendar/events', {
        client_id: clientId,
        events: extractedDates
      });

      if (response.data) {
        setCalendarResult(response.data);
        
        if (onCalendarSuccess) {
          onCalendarSuccess(response.data);
        }

        toast({
          title: "Calendar Integration",
          description: `Successfully added ${response.data.events_added} events to calendar`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error adding dates to calendar:", error);
      toast({
        title: "Calendar Error",
        description: "Failed to add events to calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Calendar Integration</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="add-to-calendar"
            checked={addToCalendar}
            onCheckedChange={setAddToCalendar}
          />
          <Label htmlFor="add-to-calendar">Add to Calendar</Label>
        </div>
      </div>

      <div className="space-y-2">
        {addToCalendar && (
          <Alert variant="outline" className="bg-muted/50">
            <CalendarCheck className="h-4 w-4" />
            <AlertTitle>Calendar Integration Enabled</AlertTitle>
            <AlertDescription>
              Extracted dates will be automatically added to your calendar.
            </AlertDescription>
          </Alert>
        )}

        {calendarResult && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Calendar Results</h4>
            <div className="text-sm text-muted-foreground">
              {Object.entries(calendarResult).map(([docId, result]: [string, any]) => (
                <div key={docId} className="flex items-center justify-between py-1 border-b">
                  <span className="truncate max-w-[200px]">{docId}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">{result?.events_added || 0} added</span>
                    {result?.events_failed > 0 && (
                      <span className="text-red-600">{result.events_failed} failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={handleExtractWithCalendar}
            disabled={isLoading || !addToCalendar}
            className="flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Extract with Calendar
          </Button>

          {extractedDates && extractedDates.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleAddExistingDatesToCalendar}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              Add Existing Dates
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 