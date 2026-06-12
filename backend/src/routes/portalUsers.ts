import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getPortalUserAdmin,
  listAllPortalUsers,
  resetPortalUserPassword,
  updatePortalAccessRole,
  updatePortalUser,
} from '../services/portalUsers';

export const portalUsersRouter = Router();

portalUsersRouter.use(authenticate);
portalUsersRouter.use(authorize('admin', 'manager'));

portalUsersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await listAllPortalUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

portalUsersRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await getPortalUserAdmin(req.params.id);
    if (!user) throw new AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

portalUsersRouter.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email().optional(),
        full_name: z.string().min(1).max(255).optional(),
        phone: z.string().max(50).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);

    const user = await updatePortalUser(req.params.id, body);
    if (!user) throw new AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

portalUsersRouter.post('/:id/reset-password', authorize('admin'), async (req, res, next) => {
  try {
    const body = z
      .object({
        password: z.string().min(8).optional(),
      })
      .parse(req.body ?? {});

    const newPassword = await resetPortalUserPassword(req.params.id, body.password);
    res.json({ data: { password: newPassword } });
  } catch (err) {
    next(err);
  }
});

portalUsersRouter.patch('/access/:accessId/role', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { portal_role } = z
      .object({
        portal_role: z.enum(['viewer', 'operator', 'manager']),
      })
      .parse(req.body);

    await updatePortalAccessRole(req.params.accessId, portal_role);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
