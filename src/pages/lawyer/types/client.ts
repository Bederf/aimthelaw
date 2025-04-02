
import * as z from "zod";

export const clientFormSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  id_number: z.string().min(6).max(50),
  phone: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
