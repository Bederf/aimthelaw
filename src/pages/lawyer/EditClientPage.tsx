import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Client } from '@/types/client';
import { Card } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumbUpdate } from '@/hooks/useBreadcrumbUpdate';
import { getEditClientBreadcrumbs } from '@/utils/breadcrumbs';

export function EditClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    status: '',
    id_number: ''
  });

  // Use breadcrumb utility to generate consistent breadcrumbs
  const clientName = client ? `${client.first_name} ${client.last_name}` : undefined;
  const breadcrumbItems = getEditClientBreadcrumbs(user?.id, id, clientName);

  // Update breadcrumbs when component mounts or client changes
  useBreadcrumbUpdate(breadcrumbItems, [client?.first_name, client?.last_name, user?.id]);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;

      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (clientData) {
          setClient(clientData);
          setFormData({
            email: clientData.email || '',
            phone: clientData.phone || '',
            status: clientData.status || '',
            id_number: clientData.id_number || ''
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch client details"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    try {
      setUploading(true);

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024
      });

      const fileName = `${client.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('clients')
        .update({ photo_url: publicUrlData.publicUrl })
        .eq('id', client.id);

      if (updateError) throw updateError;

      setClient(prev => prev ? { ...prev, photo_url: publicUrlData.publicUrl } : null);

      toast({
        title: "Success",
        description: "Profile photo updated successfully"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload profile photo"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          id_number: formData.id_number
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client details updated successfully"
      });

      navigate(`/lawyer/clients/${client.id}`);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update client details"
      });
    }
  };

  if (loading) {
    return (
      <Layout
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout
        breadcrumbItems={breadcrumbItems}
      >
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Client Not Found</h1>
          <p>The requested client could not be found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbItems={breadcrumbItems}
    >
      <div className="container mx-auto py-8">
        {/* Page header with title and action button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            Edit {client.first_name} {client.last_name}
          </h1>
          
          <Button
            variant="outline"
            onClick={() => navigate(`/lawyer/clients/${client.id}`)}
          >
            View Client
          </Button>
        </div>
        
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                {client.photo_url && (
                  <img
                    src={client.photo_url}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Photo'}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit">
                Save Changes
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/lawyer/clients/${client.id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
} 