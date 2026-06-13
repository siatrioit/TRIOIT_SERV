import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { getCompanySettings, updateCompanySettings } from '../services/companySettings';

export const companySettingsRouter = Router();

const updateSchema = z.object({
  company_name: z.string().max(255).optional(),
  header_line1: z.string().max(255).nullable().optional(),
  header_line2: z.string().max(255).nullable().optional(),
  header_line3: z.string().max(255).nullable().optional(),
  registration_number: z.string().max(50).nullable().optional(),
  vat_number: z.string().max(50).nullable().optional(),
  address: z.string().max(2000).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  bank_name: z.string().max(255).nullable().optional(),
  bank_account: z.string().max(100).nullable().optional(),
});

companySettingsRouter.use(authenticate);

companySettingsRouter.get('/', authorize('admin', 'manager', 'technician', 'viewer'), async (_req, res, next) => {
  try {
    const data = await getCompanySettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

companySettingsRouter.put('/', authorize('admin'), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const data = await updateCompanySettings(body, req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
