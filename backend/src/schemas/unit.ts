import { z } from 'zod';
import { optionalString } from './fields';

export const unitTypeSchema = z.enum(['computer', 'pos', 'printer', 'network', 'other']);
export const unitStatusSchema = z.enum(['active', 'repair', 'decommissioned', 'spare']);

export const unitInputSchema = z.object({
  unit_type: unitTypeSchema.default('other'),
  serial_number: z.string().min(1).max(100),
  model: optionalString,
  manufacturer: optionalString,
  status: unitStatusSchema.default('active'),
  location_note: optionalString,
  installed_at: optionalString,
  notes: optionalString,
});

export const unitUpdateSchema = unitInputSchema.partial();
