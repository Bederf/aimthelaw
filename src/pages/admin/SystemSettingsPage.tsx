import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Book, Trash, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/lib/api';
import { tokenTrackingService } from '@/services/tokenTrackingService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface LegalDocument {
  id: string;
  title: string;
  type: string;
  description: string;
  file_path: string;
  file_size: number;
  created_at: string;
  metadata: {
    pyramid_levels?: {
      summary?: boolean;
      concepts?: boolean;
      insights?: boolean;
    };
    processing_status?: string;
    error_message?: string;
  };
}

export function SystemSettingsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('act');
  const [description, setDescription] = useState('');
  const [queryText, setQueryText] = useState('');
  const [isQueryingKnowledge, setIsQueryingKnowledge] = useState(false);
  const [knowledgeResults, setKnowledgeResults] = useState<any[]>([]);

  // Add breadcrumb items for consistent navigation
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'System Settings' }
  ];

  useEffect(() => {
    fetchLegalDocuments();
  }, []);

  const fetchLegalDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('training_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching training documents:', error);
      toast.error('Failed to load training documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    console.log('Starting file upload process');
    
    try {
      const file = e.target.files[0];
      console.log(`File to upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        console.error(`Invalid file type: ${file.type}`);
        throw new Error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.');
      }

      // Validate file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 10MB limit.');
      }
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }
      
      // Upload to Supabase Storage in training-documents bucket
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${selectedType}/${fileName}`;
      console.log(`Target file path: ${filePath}`);
      
      // Get the MIME type based on file extension
      const getMimeType = (filename: string) => {
        const ext = filename.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'txt': 'text/plain'
        };
        return mimeTypes[ext || ''] || 'application/octet-stream';
      };
      
      const contentType = getMimeType(file.name);
      console.log(`File MIME type: ${contentType}`);
      
      // Use a more direct approach with Supabase REST API
      console.log('Using direct Supabase REST API approach...');
      
      // Get the Supabase URL and key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://weujfmfubskndhvokixy.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token;
      
      const uploadUrl = `${supabaseUrl}/storage/v1/object/training-documents/${filePath}`;
      console.log(`Uploading to: ${uploadUrl}`);
      
      // Create a blob with the file data
      const fileBlob = new Blob([await file.arrayBuffer()], { type: contentType });
      
      // Use a regular fetch with the correct content-type
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': contentType,
          'Cache-Control': 'max-age=3600'
        },
        body: fileBlob  // Send the blob directly with the correct content type
      });
      
      if (!uploadResponse.ok) {
        let errorMessage = `Upload failed with status ${uploadResponse.status}`;
        try {
          const errorData = await uploadResponse.json();
          console.error('Upload error details:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Could not parse upload error response', await uploadResponse.text());
        }
        throw new Error(errorMessage);
      }
      
      console.log('File upload successful');

      // Create database record in training_files table
      const { data: documentRecord, error: dbError } = await supabase
        .from('training_files')
        .insert([
          {
            title: file.name,
            type: selectedType,
            description: description.trim() || 'Training document',
            file_path: filePath,
            file_size: file.size,
            metadata: {
              original_name: file.name,
              mime_type: contentType,
              uploaded_by: session.user.id,
              processing_status: 'pending'
            }
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger document processing
      const response = await fetch(`${API_BASE_URL}/api/admin/training/process/${documentRecord.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start document processing');
      }

      // Try to get token usage information from the response
      try {
        const responseData = await response.json();
        
        // If the API returns token usage data, record it
        if (responseData && responseData.token_usage) {
          console.log('Training document processing token usage:', responseData.token_usage);
          
          // Record token usage in the tracking service
          await tokenTrackingService.recordTokenUsage({
            clientId: 'admin', // For training documents, use 'admin' as the client
            promptTokens: responseData.token_usage.prompt_tokens || 0,
            completionTokens: responseData.token_usage.completion_tokens || 0,
            model: responseData.token_usage.model || 'gpt-4',
            service: 'training_document_processing',
            metadata: {
              document_id: documentRecord.id,
              document_title: file.name,
              document_type: selectedType,
              document_size: file.size,
              operation: 'training_embeddings_generation'
            }
          });
        } else {
          // If the API doesn't return token usage, estimate based on file size
          // Roughly estimate tokens: ~4 chars per token
          const estimatedTokens = Math.ceil(file.size / 4);
          const promptTokens = estimatedTokens;
          const completionTokens = Math.ceil(estimatedTokens * 0.3); // Assume 30% for completion (training might be more complex)
          
          console.log(`Estimated training document processing token usage: ${estimatedTokens} tokens`);
          
          // Record estimated token usage
          await tokenTrackingService.recordTokenUsage({
            clientId: 'admin',
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            model: 'gpt-4', // Assume default model
            service: 'training_document_processing',
            metadata: {
              document_id: documentRecord.id,
              document_title: file.name,
              document_type: selectedType,
              document_size: file.size,
              operation: 'training_embeddings_generation',
              is_estimated: true
            }
          });
        }
      } catch (tokenError) {
        // Don't fail the whole operation if token tracking fails
        console.error('Error tracking token usage:', tokenError);
      }

      toast.success('Training document uploaded and processing started');
      setDescription(''); // Reset description
      fetchLegalDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      
      // Try to get a meaningful error message
      let errorMessage = 'Failed to upload document';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Special handling for common Supabase storage errors
      if (errorMessage.includes('invalid_mime_type') || errorMessage.includes('415')) {
        errorMessage = `Invalid file type. This might be due to MIME type issues. Please ensure you're uploading a valid PDF, DOC, DOCX, or TXT file.`;
        
        // Alert admin about a potential system configuration issue
        console.error(`MIME type error detected - the system might need configuration updates.`);
      }
      
      toast.error(errorMessage);
      
      // If it's a MIME type issue, suggest an alternative
      if (errorMessage.includes('mime type') || errorMessage.includes('415')) {
        toast.info("You can also try a different file or contact the system administrator if this persists.", { 
          duration: 6000 
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string, filePath: string) => {
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('training-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Then delete from database
      const { error: dbError } = await supabase
        .from('training_files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Training document deleted successfully');
      fetchLegalDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTestKnowledgeRetrieval = async () => {
    setIsQueryingKnowledge(true);
    setKnowledgeResults([]); // Clear previous results
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/training/test-knowledge-retrieval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to test knowledge retrieval');
      }

      const data = await response.json();
      setKnowledgeResults(data);
      toast.success('Knowledge retrieval test successful!');
    } catch (error: any) {
      console.error('Error testing knowledge retrieval:', error);
      toast.error(`Error testing knowledge retrieval: ${error.message}`);
    } finally {
      setIsQueryingKnowledge(false);
    }
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Training Document Management</h1>
            <p className="text-muted-foreground mb-6">
              Upload and manage training documents for the AI system.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Upload Training Document</h2>
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <p>Upload legal documents for AI training. Documents will be processed and added to the training corpus.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document-type">Document Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="act">Act</SelectItem>
                          <SelectItem value="law">Law</SelectItem>
                          <SelectItem value="regulation">Regulation</SelectItem>
                          <SelectItem value="case">Case Law</SelectItem>
                          <SelectItem value="commentary">Legal Commentary</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Brief description of the document"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button disabled={uploading} className="hover-card relative">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload Training Document'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {loading ? (
                <Card className="p-4">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-secondary/50 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-secondary/50 rounded"></div>
                        <div className="h-4 bg-secondary/50 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Book className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              doc.metadata?.processing_status === 'completed' ? 'bg-green-100 text-green-800' : 
                              doc.metadata?.processing_status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {doc.metadata?.processing_status === 'completed' ? 'Processed' : 
                               doc.metadata?.processing_status === 'error' ? 'Error' : 'Processing'}
                            </span>
                            {doc.metadata?.error_message && (
                              <span className="text-xs text-red-600" title={doc.metadata.error_message}>
                                Error: {doc.metadata.error_message.slice(0, 50)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-4">
                  <div className="text-center text-muted-foreground">
                    <p>No training documents uploaded yet</p>
                  </div>
                </Card>
              )}
            </div>

            <Card className="mt-4 p-4">
              <h2 className="text-lg font-semibold mb-4">Test Knowledge Retrieval</h2>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="query">Enter Query to Test Training Knowledge</Label>
                  <Textarea
                    id="query"
                    placeholder="e.g., What are children's rights?"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleTestKnowledgeRetrieval} disabled={isQueryingKnowledge}>
                  {isQueryingKnowledge ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Book className="mr-2 h-4 w-4" />
                      Test Knowledge Retrieval
                    </>
                  )}
                </Button>

                {knowledgeResults.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <h3 className="font-medium">Retrieved Knowledge:</h3>
                    {knowledgeResults.map((result, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            Similarity: {(result.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm">{result.content}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </Layout>
  );
} 