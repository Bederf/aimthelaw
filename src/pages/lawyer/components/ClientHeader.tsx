import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, DollarSign, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Client } from "@/types/client";

interface ClientHeaderProps {
  client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/lawyer/clients')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold text-gradient">
            {client?.first_name} {client?.last_name}
          </h1>
        </div>
        <p className="text-muted-foreground">
          Client since {new Date(client?.created_at || '').toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/lawyer/clients/${client?.id}/billing`)}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          View Billing
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/lawyer/clients/${client?.id}/edit`)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Client
        </Button>
        <Button
          onClick={() => navigate(`/lawyer/clients/${client?.id}/ai-lawyer`)}
        >
          <Bot className="h-4 w-4 mr-2" />
          AI Lawyer
        </Button>
      </div>
    </div>
  );
}
