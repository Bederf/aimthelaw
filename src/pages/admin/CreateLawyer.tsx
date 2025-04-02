import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  id_number: z.string().min(6).max(50),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateLawyerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add breadcrumb items for consistent navigation
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Lawyers', href: '/admin/lawyers' },
    { label: 'Create Lawyer' }
  ];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      id_number: "",
      phone: "",
    },
  });

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
      setPhotoFile(file);
    }
  };

  const uploadPhoto = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('lawyer-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    return fileName;
  };

  const onSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);

      // Generate lawyer_id first since we'll use it as the password
      const { data: lawyerIdData, error: lawyerIdError } = await supabase
        .rpc('generate_lawyer_id', {
          p_surname: formData.lastName,
          p_id_number: formData.id_number
        });

      if (lawyerIdError) {
        toast({
          title: "Error",
          description: "Failed to generate lawyer ID",
          variant: "destructive",
        });
        return;
      }

      // Create auth user with lawyer_id as password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: lawyerIdData,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (authError || !authData.user) {
        toast({
          title: "Error",
          description: authError?.message || "Failed to create auth user",
          variant: "destructive",
        });
        return;
      }

      // Upload photo if one was selected
      let photoUrl = null;
      if (photoFile) {
        try {
          const fileName = await uploadPhoto(authData.user.id, photoFile);
          const { data: { publicUrl } } = supabase.storage
            .from('lawyer-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          // Continue with lawyer creation even if photo upload fails
        }
      }

      // Create lawyer record - using exact schema fields
      const { error: lawyerError } = await supabase
        .from('lawyers')
        .insert([{
          id: authData.user.id,           // uuid - NOT NULL
          lawyer_id: lawyerIdData,        // text - NOT NULL
          email: formData.email,          // text - NOT NULL
          id_number: formData.id_number,  // text - NOT NULL
          phone: formData.phone || null,  // text - NULL allowed
          status: 'active',               // text - default 'active'
          role: 'lawyer',                 // text - NOT NULL
          photo_url: photoUrl            // text - NULL allowed
        }]);

      if (lawyerError) {
        toast({
          title: "Error",
          description: "Failed to create lawyer record",
          variant: "destructive",
        });
        return;
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          lawyer_id: lawyerIdData,
          first_name: formData.firstName,
          last_name: formData.lastName
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue even if profile creation fails
      }

      toast({
        title: "Success",
        description: `Lawyer account created successfully. Initial password is: ${lawyerIdData}`,
      });

      // Redirect back to lawyer directory
      navigate('/admin/lawyers');
      
    } catch (error: any) {
      console.error('Error creating lawyer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lawyer account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container max-w-3xl py-10">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/admin/lawyers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lawyers
        </Button>

        <PageHeader
          title="Create New Lawyer"
          description="Add a new lawyer to the system"
        />

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Lawyer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </Layout>
  );
}
