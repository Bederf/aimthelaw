
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { ClientFile, DocumentCategory } from "../types/client-view";

interface FileSectionProps {
  clientId: string;
  files: ClientFile[];
  category: DocumentCategory | null;
  onUploadComplete: (fileId: string) => void;
  onFileDeleted: () => void;
}

export function FileSection({ 
  clientId, 
  files, 
  category, 
  onUploadComplete, 
  onFileDeleted 
}: FileSectionProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-lg p-8">
        <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
        <FileUpload
          onUploadComplete={onUploadComplete}
          clientId={clientId}
          category={category?.category}
          subcategory={category?.subcategory}
        />
      </div>

      <div className="glass-card rounded-lg p-8">
        <h3 className="text-lg font-semibold mb-4">Client Documents</h3>
        <FileList
          files={files}
          onFileDeleted={onFileDeleted}
        />
      </div>
    </div>
  );
}
