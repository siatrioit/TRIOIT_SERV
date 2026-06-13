import { z } from 'zod';
import { optionalString } from './fields';

export const productGroupInputSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const productInputSchema = z.object({
  group_id: z.string().uuid().nullable().optional(),
  sku: optionalString,
  name: z.string().min(1).max(255),
  description: optionalString,
  unit: z.string().min(1).max(20).default('gab'),
  min_quantity: z.number().nonnegative().nullable().optional(),
  purchase_price: z.number().nonnegative().nullable().optional(),
  sale_price: z.number().nonnegative().nullable().optional(),
  is_service: z.coerce.boolean().optional(),
});

const lineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative().nullable().optional(),
});

export const receiptInputSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_document_number: optionalString,
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operation_description: optionalString,
  notes: optionalString,
  lines: z.array(lineSchema).min(1),
});

export const issueInputSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_document_number: optionalString,
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operation_description: optionalString,
  delivery_address: optionalString,
  notes: optionalString,
  lines: z.array(lineSchema).min(1),
});
