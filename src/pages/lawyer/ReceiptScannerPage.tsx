import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Receipt, Smartphone, Upload, Download, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/components/Layout';
import { ReceiptUploader } from '@/components/maintenance/ReceiptUploader';
import { ReceiptsList } from '@/components/maintenance/ReceiptsList';
import { fromTable } from '@/utils/supabase-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/api/apiClient';

export default function ReceiptScannerPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);
  
  const fetchClientData = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // Fetch client basic info using type-safe query
      const { data: clientData, error: clientError } = await fromTable('clients')
        .select(`
          id,
          email,
          phone
        `)
        .eq('id', clientId)
        .single();
        
      if (clientError) throw clientError;
      
      // Fetch profile data for name
      const { data: profileData, error: profileError } = await fromTable('profiles')
        .select('first_name, last_name')
        .eq('user_id', clientId)
        .maybeSingle();
        
      if (profileError) console.warn('Could not fetch profile data:', profileError);
      
      // Combine data
      const fullClientData = {
        ...clientData,
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || ''
      };
      
      setClient(fullClientData);
      
      // Generate mobile app QR code with client ID
      generateQrCode();
      
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load client information"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const generateQrCode = async () => {
    try {
      // Revert to a placeholder QR code URL or a more generic mobile app link
      // **IMPORTANT:** Replace 'YOUR_MOBILE_APP_LINK_HERE' with the actual link
      // to your mobile app in the app stores or a general website about your app.
      const mobileAppPlaceholderLink = 'https://example.com/your-mobile-app'; // REPLACE THIS!

      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileAppPlaceholderLink)}`);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };
  
  const handleUploadComplete = (fileUrl: string, extractedData: any) => {
    toast({
      title: "Receipt Processed",
      description: "The receipt has been uploaded and processed successfully."
    });
    
    // Trigger a refresh of the receipts list
    setRefreshTrigger(prev => prev + 1);
  };
  
  const generateExpenseReport = async () => {
    if (!clientId) return;
    
    try {
      setIsGeneratingReport(true);
      
      // Get date range (last 3 months by default)
      const today = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      const startDate = threeMonthsAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      // Call the API to generate the report
      const reportBlob = await api.generateExpenseReport(clientId, {
        startDate,
        endDate,
        format: 'xlsx'
      });
      
      // Create a download link for the blob
      const url = URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${clientId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Generated",
        description: "Expense report has been generated and downloaded."
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate expense report"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  const handleGoBack = () => {
    navigate(`/lawyer/clients/${clientId}`);
  };
  
  const clientName = client ? `${client.first_name} ${client.last_name}` : 'Client';
  
  return (
    <Layout
      title="Receipt Scanner"
      breadcrumbItems={[
        { label: 'Clients', href: '/lawyer/clients' },
        { label: 'Client Details', href: `/lawyer/clients/${clientId}` },
        { label: 'Receipt Scanner' }
      ]}
    >
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center">
                    <Receipt className="mr-2 h-6 w-6" />
                    Receipt Scanner: {clientName}
                  </CardTitle>
                  <CardDescription>
                    Scan and track child-related expenses for maintenance claims
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGoBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Client
                  </Button>
                  <Button 
                    onClick={generateExpenseReport} 
                    disabled={isGeneratingReport}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {isGeneratingReport ? 'Generating...' : 'Generate Expense Report'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="scan" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="scan">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </TabsTrigger>
                  <TabsTrigger value="receipts">
                    <FileText className="h-4 w-4 mr-2" />
                    View Receipts
                  </TabsTrigger>
                  <TabsTrigger value="app">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile App
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="scan" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Upload Receipt</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload a photo of a receipt to automatically extract expense information. 
                        The system will process the image using OCR to identify store name, date, 
                        items, and total amount.
                      </p>
                      
                      <Alert className="mb-4">
                        <AlertTitle>Tips for best results</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Ensure the receipt is flat and well-lit</li>
                            <li>Capture the entire receipt in the photo</li>
                            <li>Make sure the text is clear and readable</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    <div>
                      <ReceiptUploader 
                        clientId={clientId || ''}
                        onUploadComplete={handleUploadComplete}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="receipts" className="space-y-4">
                  <h3 className="text-lg font-medium mb-4">Receipt History</h3>
                  <ReceiptsList 
                    clientId={clientId || ''}
                    showAddToExpenses={true}
                    key={`receipt-list-${refreshTrigger}`}
                  />
                </TabsContent>
                
                <TabsContent value="app" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Mobile App</h3>
                      <p className="text-muted-foreground mb-4">
                        Download our mobile app to easily scan receipts on-the-go. The app allows you to:
                      </p>
                      
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center">
                          <div className="bg-primary/10 p-2 rounded-full mr-3">
                            <Smartphone className="h-4 w-4 text-primary" />
                          </div>
                          <span>Take photos of receipts instantly</span>
                        </li>
                        <li className="flex items-center">
                          <div className="bg-primary/10 p-2 rounded-full mr-3">
                            <Upload className="h-4 w-4 text-primary" />
                          </div>
                          <span>Upload receipts directly to the system</span>
                        </li>
                        <li className="flex items-center">
                          <div className="bg-primary/10 p-2 rounded-full mr-3">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <span>Categorize expenses automatically</span>
                        </li>
                      </ul>
                      
                      <div className="flex flex-col gap-3">
                        <Button className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          Download for iOS
                        </Button>
                        <Button className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          Download for Android
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-white p-4 rounded-lg shadow-md">
                        {qrCodeUrl && (
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code for Mobile App" 
                            className="w-48 h-48"
                          />
                        )}
                      </div>
                      <p className="text-center mt-4 text-sm text-muted-foreground">
                        Scan this QR code with your phone's camera to download the app
                        <br />
                        and automatically link it to this client's account.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="bg-muted/10 border-t">
              <div className="w-full">
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> The Receipt Scanner uses OCR technology to extract data from receipt images. 
                  All expenses are categorized and stored securely, ready for legal maintenance claims.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 