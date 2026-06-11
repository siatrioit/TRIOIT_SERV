import { z } from 'zod';
import { boolish, emptyToUndefined, optionalEmail, optionalString } from './fields';

export const clientObjectSchema = z.object({
  name: z.string().min(1).max(255),
  object_code: optionalString,
  address: optionalString,
  city: optionalString,
  postal_code: optionalString,
  country: z.preprocess(emptyToUndefined, z.string().length(2).default('LV')),
  latitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-180).max(180).optional()),
  contact_name: optionalString,
  contact_phone: optionalString,
  contact_email: optionalEmail,
  access_notes: optionalString,
  notes: optionalString,
  is_primary: boolish.optional().default(false),
  assigned_user_id: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().uuid().nullable().optional()
  ),
});

export const clientObjectInputSchema = clientObjectSchema.extend({
  id: z.string().uuid().optional(),
});

export type ClientObjectInput = z.infer<typeof clientObjectInputSchema>;
