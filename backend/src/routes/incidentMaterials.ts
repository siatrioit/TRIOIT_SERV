import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  addIncidentMaterial,
  deleteIncidentMaterial,
  listIncidentMaterials,
} from '../services/incidentWork';
import { incidentMaterialInputSchema } from '../schemas/warehouse';

type Params = { incidentId: string };

export const incidentMaterialsRouter = Router({ mergeParams: true });
incidentMaterialsRouter.use(authenticate);

incidentMaterialsRouter.get('/', async (req: Request<Params>, res, next) => {
  try {
    const materials = await listIncidentMaterials(req.params.incidentId);
    res.json({ data: materials });
  } catch (err) {
    next(err);
  }
});

incidentMaterialsRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<Params>, res, next) => {
    try {
      const body = incidentMaterialInputSchema.parse(req.body);
      const material = await addIncidentMaterial(
        req.params.incidentId,
        body,
        req.user!.userId
      );
      res.status(201).json({ data: material });
    } catch (err) {
      next(err);
    }
  }
);

incidentMaterialsRouter.delete(
  '/:materialId',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<Params & { materialId: string }>, res, next) => {
    try {
      await deleteIncidentMaterial(req.params.incidentId, req.params.materialId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
