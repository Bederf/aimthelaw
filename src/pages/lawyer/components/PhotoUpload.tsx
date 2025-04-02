
import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  onPhotoChange: (file: File | null) => void;
  photoFile: File | null;
}

export const PhotoUpload = ({ onPhotoChange, photoFile }: PhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Photo size should be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      onPhotoChange(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="photo">Photo</Label>
      <div className="flex items-center gap-4">
        <Input
          id="photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          ref={fileInputRef}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>
        {photoFile && (
          <span className="text-sm text-muted-foreground">
            {photoFile.name}
          </span>
        )}
      </div>
    </div>
  );
};
