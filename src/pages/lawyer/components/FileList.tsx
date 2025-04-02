import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClientFile } from "../types/file";
import { createDocumentService } from "@/services/documentService";
import { useParams } from "react-router-dom";

interface FileListProps {
  files: ClientFile[];
  onFileDeleted: () => void;
}

export function FileList({ files, onFileDeleted }: FileListProps) {
  const { id: clientId } = useParams<{ id: string }>();

  const handleDeleteFile = async (file: ClientFile) => {
    if (!clientId) {
      toast.error('No client ID available');
      return;
    }

    try {
      // Use the DocumentService for proper deletion
      const documentService = createDocumentService(clientId);
      await documentService.safeDeleteDocument({
        id: file.id,
        file_path: file.file_path
      });

      toast.success('File deleted successfully');
      onFileDeleted();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Error deleting file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-4 rounded-lg border"
        >
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{file.file_name}</h4>
            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
              <span>{formatFileSize(file.file_size)}</span>
              <span>•</span>
              <span>{file.category}</span>
              <span>•</span>
              <span>{file.subcategory}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteFile(file)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
