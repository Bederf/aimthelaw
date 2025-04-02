
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClientManagementHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">Client Management</h1>
        <p className="text-muted-foreground">
          View and manage your client list
        </p>
      </div>
      <Button onClick={() => navigate('/lawyer/clients/new')}>
        <Plus className="mr-2 h-4 w-4" />
        Add New Client
      </Button>
    </div>
  );
}
