import { z } from "zod";

export const clientFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  id_number: z.string().min(1, "ID number is required"),
  phone: z.string().optional(),
  role: z.literal('client').default('client')
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

export interface CreateClientResponse {
  id: string;
  client_id: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: 'client';
  status: string;
  id_number: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}