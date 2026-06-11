import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createUserSchema, updateUserSchema } from '../schemas/user';
import {
  createStaffUser,
  getStaffUser,
  listStaffUsers,
  updateStaffUser,
} from '../services/users';
import { listAssignableStaff } from '../services/incidentAssignment';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/assignable', authorize('admin', 'manager', 'technician'), async (_req, res, next) => {
  try {
    const users = await listAssignableStaff();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/', authorize('admin', 'manager'), async (_req, res, next) => {
  try {
    const users = await listStaffUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const user = await getStaffUser(req.params.id);
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await createStaffUser(body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
});

usersRouter.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const body = updateUserSchema.parse(req.body);
    const user = await updateStaffUser(req.params.id, body, req.user!.userId);
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});
