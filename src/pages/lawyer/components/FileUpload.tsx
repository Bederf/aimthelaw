import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { DocumentCategory, DocumentSubcategory } from "../types/file";

interface FileUploadProps {
  clientId: string;
  onUploadComplete: () => void;
}

export function FileUpload({ clientId, onUploadComplete }: FileUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [subcategory, setSubcategory] = useState<DocumentSubcategory>('miscellaneous');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      setUploading(true);

      // Create storage bucket if it doesn't exist
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket('client-files');

      if (bucketError && bucketError.message.includes('does not exist')) {
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('client-files', { public: false });

        if (createBucketError) {
          throw createBucketError;
        }
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create file record in database
      const { error: dbError } = await supabase
        .from('client_files')
        .insert([{
          client_id: clientId,
          lawyer_id: user?.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category: category,
          subcategory: subcategory,
          status: 'uploading',
          metadata: {
            upload_started: new Date().toISOString(),
            original_name: file.name,
            mime_type: file.type
          }
        }]);

      if (dbError) {
        // If database insert fails, try to clean up the uploaded file
        await supabase.storage
          .from('client-files')
          .remove([filePath]);
        throw dbError;
      }

      toast.success('File uploaded successfully, processing will begin shortly');
      onUploadComplete();
      
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as DocumentCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="legal_documents">Legal Documents</SelectItem>
            <SelectItem value="financial_records">Financial Records</SelectItem>
            <SelectItem value="correspondence">Correspondence</SelectItem>
            <SelectItem value="evidence">Evidence</SelectItem>
            <SelectItem value="court_filings">Court Filings</SelectItem>
            <SelectItem value="personal_documents">Personal Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={subcategory}
          onValueChange={(value) => setSubcategory(value as DocumentSubcategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contracts">Contracts</SelectItem>
            <SelectItem value="agreements">Agreements</SelectItem>
            <SelectItem value="invoices">Invoices</SelectItem>
            <SelectItem value="statements">Statements</SelectItem>
            <SelectItem value="letters">Letters</SelectItem>
            <SelectItem value="emails">Emails</SelectItem>
            <SelectItem value="photos">Photos</SelectItem>
            <SelectItem value="videos">Videos</SelectItem>
            <SelectItem value="pleadings">Pleadings</SelectItem>
            <SelectItem value="motions">Motions</SelectItem>
            <SelectItem value="identification">Identification</SelectItem>
            <SelectItem value="certificates">Certificates</SelectItem>
            <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
