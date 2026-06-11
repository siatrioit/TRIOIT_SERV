import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import {
  createUnitForObject,
  deleteUnitForObject,
  getUnitForObject,
  listUnitsForObject,
  updateUnitForObject,
} from '../services/units';

type ObjectUnitParams = { clientId: string; objectId: string };
type ObjectUnitItemParams = { clientId: string; objectId: string; unitId: string };

export const objectUnitsRouter = Router({ mergeParams: true });

objectUnitsRouter.use(authenticate);

objectUnitsRouter.get('/', async (req: Request<ObjectUnitParams>, res, next) => {
  try {
    const { clientId, objectId } = req.params;
    const units = await listUnitsForObject(clientId, objectId);
    res.json({ data: units });
  } catch (err) {
    next(err);
  }
});

objectUnitsRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<ObjectUnitParams>, res, next) => {
    try {
      const { clientId, objectId } = req.params;
      const body = unitInputSchema.parse(req.body);
      const unit = await createUnitForObject(clientId, objectId, body);
      res.status(201).json({ data: unit });
    } catch (err) {
      next(err);
    }
  }
);

objectUnitsRouter.put(
  '/:unitId',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<ObjectUnitItemParams>, res, next) => {
    try {
      const { clientId, objectId, unitId } = req.params;
      const body = unitUpdateSchema.parse(req.body);
      const unit = await updateUnitForObject(clientId, objectId, unitId, body);
      if (!unit) throw new AppError(404, 'Unit not found', 'NOT_FOUND');
      res.json({ data: unit });
    } catch (err) {
      next(err);
    }
  }
);

objectUnitsRouter.delete(
  '/:unitId',
  authorize('admin', 'manager'),
  async (req: Request<ObjectUnitItemParams>, res, next) => {
    try {
      const { clientId, objectId, unitId } = req.params;
      await deleteUnitForObject(clientId, objectId, unitId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

objectUnitsRouter.get('/:unitId', async (req: Request<ObjectUnitItemParams>, res, next) => {
  try {
    const { clientId, objectId, unitId } = req.params;
    const unit = await getUnitForObject(clientId, objectId, unitId);
    if (!unit) throw new AppError(404, 'Unit not found', 'NOT_FOUND');
    res.json({ data: unit });
  } catch (err) {
    next(err);
  }
});
