import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/lib/api';

export interface Insight {
  id: string;
  file_id: string;
  insight_type: string;
  content: any;
  confidence: number;
  metadata: Record<string, any>;
  extracted_at: string;
}

export type InsightType = 
  | 'key_dates'
  | 'payment_details'
  | 'court_proceedings'
  | 'legal_orders'
  | 'compliance_items'
  | 'parties'
  | 'referenced_documents';

export interface UseDocumentInsightsProps {
  documentIds: string[];  // Keep this for backward compatibility
  client_id: string;
  insightTypes?: InsightType[];
  confidenceThreshold?: number;
  enabled?: boolean;
}

// Add constants for type safety
export const InsightTypes = {
  KEY_DATES: 'key_dates' as InsightType,
  PAYMENT_DETAILS: 'payment_details' as InsightType,
  COURT_PROCEEDINGS: 'court_proceedings' as InsightType,
  LEGAL_ORDERS: 'legal_orders' as InsightType,
  COMPLIANCE_ITEMS: 'compliance_items' as InsightType,
  PARTIES: 'parties' as InsightType,
  REFERENCED_DOCUMENTS: 'referenced_documents' as InsightType,
} as const;

export interface InsightError {
  code: string;
  message: string;
  file_id?: string;
}

export interface InsightResponse {
  status: 'success' | 'partial' | 'error';
  insights: Insight[];
  errors?: Array<{
    file_id: string;
    error: string;
    code: string;
  }>;
  total_insights: number;
  processed_files: number;
  failed_files: number;
}

export function useDocumentInsights({
  documentIds,
  client_id,
  insightTypes,
  confidenceThreshold = 0.7,
  enabled = true
}: UseDocumentInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<InsightError | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      // Input validation
      if (!enabled) return;
      if (!documentIds || documentIds.length === 0) {
        setError({ code: 'MISSING_FILE_IDS', message: 'No document IDs provided' });
        return;
      }
      if (!client_id) {
        setError({ code: 'MISSING_CLIENT_ID', message: 'Client ID is required' });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get auth token
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        if (!token) {
          throw new Error('No authentication token available');
        }

        // Fetch insights
        const requestPayload = {
          file_ids: documentIds,
          client_id: client_id,
          insight_types: insightTypes || []
        };
        
        console.log('Insights request payload:', requestPayload);  // Debug log
        
        const response = await fetch(`${API_BASE_URL}/api/insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestPayload)
        });

        const data: InsightResponse = await response.json();
        console.log('Insights response:', { status: response.status, data });  // Debug log

        if (!response.ok) {
          // Handle structured error responses
          if (data.errors && data.errors.length > 0) {
            console.error('Insights errors:', data.errors);  // Debug log
            setError({
              code: data.errors[0].code,
              message: data.errors[0].error,
              file_id: data.errors[0].file_id
            });
          } else if (data.status === 'error') {
            setError({
              code: 'API_ERROR',
              message: 'Failed to fetch insights'
            });
          }
          return;
        }

        // Filter insights by confidence threshold if specified
        const filteredInsights = data.insights.filter((insight: Insight) => 
          insight.confidence >= confidenceThreshold
        );
        
        setInsights(filteredInsights);

        // Log any partial success errors
        if (data.status === 'partial' && data.errors) {
          console.warn('Some files failed to process:', data.errors);
        }

      } catch (err) {
        console.error('Error fetching insights:', err);
        setError({
          code: 'FETCH_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch insights'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [documentIds, insightTypes, confidenceThreshold, enabled, client_id]);

  // Helper function to get insights of a specific type
  const getInsightsByType = (type: InsightType) => {
    return insights.filter(insight => insight.insight_type === type);
  };

  // Helper function to get all dates
  const getDates = () => {
    return getInsightsByType('key_dates').map(insight => ({
      date: insight.content.date,
      event: insight.content.event,
      confidence: insight.confidence,
      context: insight.content.context
    }));
  };

  // Helper function to get all parties
  const getParties = () => {
    return getInsightsByType('parties').map(insight => ({
      name: insight.content.name,
      role: insight.content.role,
      confidence: insight.confidence
    }));
  };

  // Helper function to get all payments
  const getPayments = () => {
    return getInsightsByType('payment_details').map(insight => ({
      amount: insight.content.amount,
      currency: insight.content.currency,
      terms: insight.content.terms,
      due_date: insight.content.due_date,
      confidence: insight.confidence
    }));
  };

  return {
    insights,
    loading,
    error,
    getInsightsByType,
    getDates,
    getParties,
    getPayments
  };
} 