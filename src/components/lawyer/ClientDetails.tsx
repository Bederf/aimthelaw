import { Client } from '@/types/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Edit } from 'lucide-react';

interface ClientDetailsProps {
  client: Client;
}

export function ClientDetails({ client }: ClientDetailsProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-semibold">Client Information</h2>
        <Button variant="outline" asChild>
          <Link to={`/lawyer/clients/${client.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
            <p className="mt-1">{client.first_name} {client.last_name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
            <p className="mt-1">{client.email || 'Not provided'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
            <p className="mt-1">{client.phone || 'Not provided'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">ID Number</h3>
            <p className="mt-1">{client.id_number || 'Not provided'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <p className="mt-1">{client.status}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Client Since</h3>
            <p className="mt-1">{new Date(client.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </Card>
  );
} 