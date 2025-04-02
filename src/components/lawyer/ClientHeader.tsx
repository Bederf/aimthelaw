import { Client } from '@/types/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface ClientHeaderProps {
  client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {client.photo_url ? (
            <AvatarImage src={client.photo_url} alt={`${client.first_name} ${client.last_name}`} />
          ) : (
            <AvatarFallback>
              {getInitials(`${client.first_name} ${client.last_name}`)}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-muted-foreground">
            {client.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              ID: {client.id_number}
            </span>
            <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
              {client.status}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
} 