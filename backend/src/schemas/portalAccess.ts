import { z } from 'zod';
import { optionalString } from './fields';

export const createPortalAccessSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(255),
  phone: optionalString,
  password: z.string().min(8).optional(),
});
