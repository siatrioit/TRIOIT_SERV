import { Router } from 'express';
import { listPortalUnitsForObject } from '../../services/units';

export const portalUnitsRouter = Router();

portalUnitsRouter.get('/', async (req, res, next) => {
  try {
    const objectId = req.query.object_id as string | undefined;
    if (!objectId) {
      res.status(400).json({ error: 'object_id required' });
      return;
    }

    const { access } = req.portalUser!;
    const clientWideIds = access.filter((g) => g.scope === 'client').map((g) => g.client_id);
    const objectScopedIds = access
      .filter((g) => g.scope === 'object' && g.object_id)
      .map((g) => g.object_id!);

    const units = await listPortalUnitsForObject(objectId, clientWideIds, objectScopedIds);
    res.json({ data: units });
  } catch (err) {
    next(err);
  }
});
