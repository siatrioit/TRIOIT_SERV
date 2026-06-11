import { z } from 'zod';
import { optionalString } from './fields';

export const userRoleSchema = z.enum(['admin', 'manager', 'technician', 'viewer']);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Parolei jābūt vismaz 8 rakstzīmēm'),
  full_name: z.string().min(1).max(255),
  phone: optionalString,
  role: userRoleSchema.default('technician'),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(255).optional(),
  phone: optionalString,
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});
