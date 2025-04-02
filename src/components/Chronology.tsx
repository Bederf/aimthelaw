import { FC } from 'react';

interface ChronologyProps {
  clientId: string | undefined;
  files: ClientFile[];
  processingFiles: Set<string>;
  onFileDeleted: () => void;
  onUploadComplete: (fileId: string) => void;
  clientCreationDate?: string | null;
}

export function Chronology({
  clientId,
  files,
  processingFiles,
  onFileDeleted,
  onUploadComplete,
  clientCreationDate
}: ChronologyProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Timeline</h3>
      {clientCreationDate && (
        <div className="chronology-item">
          <div className="chronology-time">
            {new Date(clientCreationDate).toLocaleDateString()}
          </div>
          <div className="chronology-event">
            Client Account Created
          </div>
        </div>
      )}
      {files.map((file) => (
        <div key={file.id} className="chronology-item">
          <div className="chronology-time">
            {new Date(file.created_at).toLocaleDateString()}
          </div>
          <div className="chronology-event">
            File Uploaded: {file.file_name}
          </div>
        </div>
      ))}
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
