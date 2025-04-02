import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function CasesPage() {
  const { user } = useAuth();
  const breadcrumbItems = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Cases' }
  ];

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Case Management</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </div>
        
        <div className="bg-card rounded-lg p-6 border">
          <p className="text-muted-foreground">
            Case management functionality is coming soon. Here you'll be able to:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>Create and manage legal cases</li>
            <li>Track case progress and deadlines</li>
            <li>Assign team members and tasks</li>
            <li>Link documents and evidence</li>
            <li>Generate case reports and analytics</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
} 