import { z } from 'zod';

export const clientObjectSchema = z.object({
  name: z.string().min(1).max(255),
  object_code: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().length(2).default('LV'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  access_notes: z.string().optional(),
  notes: z.string().optional(),
  is_primary: z.boolean().default(false),
});

export const clientObjectInputSchema = clientObjectSchema.extend({
  id: z.string().uuid().optional(),
});

export type ClientObjectInput = z.infer<typeof clientObjectInputSchema>;
