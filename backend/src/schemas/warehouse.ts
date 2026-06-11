import { z } from 'zod';
import { emptyToUndefined, optionalString } from './fields';

export const warehouseItemInputSchema = z.object({
  sku: optionalString,
  name: z.string().min(1).max(255),
  description: optionalString,
  unit: z.string().min(1).max(20).default('gab'),
  min_quantity: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
});

export const warehouseStockInSchema = z.object({
  quantity: z.coerce.number().positive(),
  notes: optionalString,
});

export const workLogInputSchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.coerce.number().int().min(1).max(24 * 60),
  description: z.string().min(1).max(2000),
  work_type: optionalString,
  user_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const incidentMaterialInputSchema = z.object({
  warehouse_item_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  notes: optionalString,
});
