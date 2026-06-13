import { z } from 'zod';
import { optionalString } from './fields';

export const unitStatusSchema = z.enum(['active', 'repair', 'decommissioned', 'spare']);

const unitFieldsSchema = z.object({
  asset_type_id: z.string().uuid().optional(),
  unit_type: z.string().min(1).max(50).optional(),
  asset_component_id: z.string().uuid().nullable().optional(),
  parent_unit_id: z.string().uuid().nullable().optional(),
  serial_number: z.string().min(1).max(100),
  model: optionalString,
  manufacturer: optionalString,
  status: unitStatusSchema.default('active'),
  location_note: optionalString,
  installed_at: optionalString,
  notes: optionalString,
});

export const unitInputSchema = unitFieldsSchema.superRefine((data, ctx) => {
  if (data.parent_unit_id) {
    if (!data.asset_component_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Apakšaktīvam jānorāda apakšsadaļa',
        path: ['asset_component_id'],
      });
    }
    return;
  }
  if (!data.asset_type_id && !data.unit_type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Norādiet aktīva tipu',
      path: ['asset_type_id'],
    });
  }
});

export const unitUpdateSchema = unitFieldsSchema.partial();
