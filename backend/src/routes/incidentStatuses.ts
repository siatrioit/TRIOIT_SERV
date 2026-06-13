import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  createIncidentStatus,
  deleteIncidentStatus,
  listIncidentStatuses,
  updateIncidentStatus,
} from '../services/incidentStatuses';

export const incidentStatusesRouter = Router();
incidentStatusesRouter.use(authenticate);

incidentStatusesRouter.get('/', async (_req, res, next) => {
  try {
    const data = await listIncidentStatuses(true);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const setupIncidentStatusesRouter = Router();
setupIncidentStatusesRouter.use(authenticate, authorize('admin'));

setupIncidentStatusesRouter.get('/', async (_req, res, next) => {
  try {
    const data = await listIncidentStatuses(false);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

setupIncidentStatusesRouter.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        label: z.string().min(1).max(100),
        code: z.string().min(1).max(50).optional(),
        category: z.enum(['open', 'closed']).optional(),
        sort_order: z.number().int().optional(),
        badge_tone: z.string().max(30).nullable().optional(),
        sync_unit_status: z.enum(['active', 'repair', 'decommissioned', 'spare']).nullable().optional(),
        sync_activity_label: z.string().max(100).nullable().optional(),
      })
      .parse(req.body);
    const data = await createIncidentStatus(body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

setupIncidentStatusesRouter.put('/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        label: z.string().min(1).max(100).optional(),
        category: z.enum(['open', 'closed']).optional(),
        sort_order: z.number().int().optional(),
        badge_tone: z.string().max(30).nullable().optional(),
        sync_unit_status: z.enum(['active', 'repair', 'decommissioned', 'spare']).nullable().optional(),
        sync_activity_label: z.string().max(100).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);
    const data = await updateIncidentStatus(req.params.id, body);
    if (!data) throw new AppError(404, 'Statuss nav atrasts', 'NOT_FOUND');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

setupIncidentStatusesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteIncidentStatus(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
