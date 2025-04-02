
import { Card } from "@/components/ui/card";
import type { Client } from "@/types/client";

interface ClientInfoProps {
  client: Client | null;
}

export function ClientInfo({ client }: ClientInfoProps) {
  if (!client) return null;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Client Information</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">{client.first_name} {client.last_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{client.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">ID Number</p>
          <p className="font-medium">{client.id_number}</p>
        </div>
        {client.phone && (
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{client.phone}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
