import { Router } from 'express';
import { listAccessibleObjects } from '../../services/portalScope';

export const portalObjectsRouter = Router();

portalObjectsRouter.get('/', async (req, res, next) => {
  try {
    const objects = await listAccessibleObjects(req.portalUser!.access);
    res.json({ data: objects });
  } catch (err) {
    next(err);
  }
});
