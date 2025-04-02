import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhotoUpload } from '@/components/lawyer/PhotoUpload';
import { useCreateClient } from '@/hooks/lawyer/useCreateClient';
import { clientFormSchema, type ClientFormData } from '@/types/lawyer/client';

export function CreateClientPage() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { isLoading, createClient } = useCreateClient();

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/lawyer' },
    { label: 'Clients', href: '/lawyer/clients' },
    { label: 'New Client' }
  ];

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      id_number: "",
      phone: "",
    },
  });

  const onSubmit = async (formData: ClientFormData) => {
    await createClient(formData, photoFile);
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container max-w-3xl py-10">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/lawyer/clients')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>

        <PageHeader
          title="Create New Client"
          description="Add a new client to the system"
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

              <PhotoUpload
                photoFile={photoFile}
                onPhotoChange={setPhotoFile}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Client
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