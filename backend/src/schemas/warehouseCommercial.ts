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
  secondary_name: optionalString,
  description: optionalString,
  unit: z.string().min(1).max(20).default('gab'),
  min_quantity: z.number().nonnegative().nullable().optional(),
  vat_rate: z.number().min(0).max(100).optional(),
  purchase_price: z.number().nonnegative().nullable().optional(),
  sale_price: z.number().nonnegative().nullable().optional(),
  is_service: z.coerce.boolean().optional(),
});

const issueLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative().nullable().optional(),
});

export const receiptHeaderInputSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_document_number: optionalString,
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operation_description: optionalString,
  notes: optionalString,
});

export const receiptLineInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  purchase_price: z.number().nonnegative().nullable().optional(),
  markup_percent: z.number().nullable().optional(),
  sale_price: z.number().nonnegative().nullable().optional(),
});

export const receiptLinesInputSchema = z.object({
  lines: z.array(receiptLineInputSchema).min(1),
});

export const receiptPaymentInputSchema = z.object({
  amount: z.number().positive(),
});

export const issueInputSchema = z.object({
  buyer_id: z.string().uuid(),
  buyer_document_number: optionalString,
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operation_description: optionalString,
  delivery_address: optionalString,
  notes: optionalString,
  lines: z.array(issueLineSchema).min(1),
});

export const receiptInputSchema = receiptHeaderInputSchema;
