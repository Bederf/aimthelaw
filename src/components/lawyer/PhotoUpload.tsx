import { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormLabel } from "@/components/ui/form";
import { Image, Upload, X } from 'lucide-react';

interface PhotoUploadProps {
  photoFile: File | null;
  onPhotoChange: (file: File | null) => void;
}

export function PhotoUpload({ photoFile, onPhotoChange }: PhotoUploadProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
  };

  return (
    <div className="space-y-2">
      <FormLabel>Photo (Optional)</FormLabel>
      <Card className="p-4">
        {photoFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span className="text-sm">{photoFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload photo</span>
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </Card>
    </div>
  );
} 