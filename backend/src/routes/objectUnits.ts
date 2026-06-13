import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import { listUnitActivity, resolveStaffActorName } from '../services/unitActivity';
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

async function actorFromReq(req: Request) {
  if (!req.user) return null;
  return {
    userId: req.user.userId,
    userName: await resolveStaffActorName(req.user.userId),
  };
}

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
      const actor = await actorFromReq(req);
      const unit = await createUnitForObject(clientId, objectId, body, actor);
      res.status(201).json({ data: unit });
    } catch (err) {
      next(err);
    }
  }
);

objectUnitsRouter.get(
  '/:unitId/activity',
  async (req: Request<ObjectUnitItemParams>, res, next) => {
    try {
      const { clientId, objectId, unitId } = req.params;
      const unit = await getUnitForObject(clientId, objectId, unitId);
      if (!unit) throw new AppError(404, 'Unit not found', 'NOT_FOUND');
      const activity = await listUnitActivity(unitId);
      res.json({ data: activity });
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
      const actor = await actorFromReq(req);
      const unit = await updateUnitForObject(clientId, objectId, unitId, body, actor);
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
      const actor = await actorFromReq(req);
      await deleteUnitForObject(clientId, objectId, unitId, actor);
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
