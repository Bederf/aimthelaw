import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useBreadcrumbUpdate } from '@/hooks/useBreadcrumbUpdate';
import { useAuth } from '@/contexts/AuthContext';
import { getAIClientBreadcrumbs } from '@/utils/breadcrumbs';
import { AILawyerProvider } from '@/features/aiLawyer/context/AILawyerContext';
import AILawyerContent from '@/features/aiLawyer/components/AILawyerContent';

// Main page component
export default function AILawyerPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use breadcrumb utility to generate consistent breadcrumbs
  const breadcrumbs = getAIClientBreadcrumbs(user?.id, clientId);

  // Update breadcrumbs when component mounts or clientId changes
  useBreadcrumbUpdate(breadcrumbs, [clientId, user?.id]);
  
  // Basic validation
  useEffect(() => {
    if (!clientId) {
      console.log('[AILawyerPage] No clientId provided, redirecting to client selection');
      toast({
        title: "No Client Selected",
        description: "Please select a client to use the AI Assistant with",
        variant: "destructive",
        action: (
          <ToastAction altText="Select Client" onClick={() => navigate('/lawyer/ai')}>
            Select Client
          </ToastAction>
        )
      });
      
      // Navigate to client selection
      navigate('/lawyer/ai');
      return;
    } 
    
    // Check if we're on the correct page for this client
    const currentPath = window.location.pathname;
    const expectedPath = `/lawyer/ai-new/${clientId}`;
    
    // If we're not on a path that at least starts with the expected path, log it
    if (!currentPath.startsWith(expectedPath)) {
      console.log(`[AILawyerPage] Path mismatch. Current: ${currentPath}, Expected: ${expectedPath}`);
    } else {
      console.log(`[AILawyerPage] Initialized with clientId: ${clientId}`);
      
      // Add debugging information to help diagnose client ID issues
      console.log(`[AILawyerPage] Client ID details:`, {
        clientId,
        length: clientId.length,
        trimmed: clientId.trim(),
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)
      });
    }
  }, [clientId, navigate, toast]);
  
  if (!clientId) {
    return null;
  }
  
  return (
    <Layout breadcrumbItems={breadcrumbs} className="h-screen flex flex-col overflow-hidden">
      <AILawyerProvider clientId={clientId}>
        <AILawyerContent />
      </AILawyerProvider>
    </Layout>
  );
} 