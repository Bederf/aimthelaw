
import { Client } from "@/types/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils/string";

interface ClientDetailsProps {
  client: Client;
}

export function ClientDetails({ client }: ClientDetailsProps) {
  return (
    <div className="glass-card rounded-lg p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={client?.photo_url || ''} alt={`${client?.first_name} ${client?.last_name}`} />
              <AvatarFallback>{getInitials(`${client?.first_name} ${client?.last_name}`)}</AvatarFallback>
            </Avatar>
          </div>
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">Full Name</dt>
              <dd className="text-lg">{`${client?.first_name || ''} ${client?.last_name || ''}`}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email Address</dt>
              <dd className="text-lg">{client?.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Phone Number</dt>
              <dd className="text-lg">{client?.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">ID Number</dt>
              <dd className="text-lg">{client?.id_number || 'Not provided'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
