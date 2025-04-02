import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function DocumentsPage() {
  const { user } = useAuth();
  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Documents' }
  ];

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Document Management</h1>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
        
        <div className="bg-card rounded-lg p-6 border">
          <p className="text-muted-foreground">
            Document management functionality is coming soon. Here you'll be able to:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>Upload and organize legal documents</li>
            <li>View document history and versions</li>
            <li>Share documents securely with clients</li>
            <li>Search and filter documents</li>
            <li>Generate document analytics</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
} 