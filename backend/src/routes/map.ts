import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listMapMarkers } from '../services/mapMarkers';

export const mapRouter = Router();

mapRouter.use(authenticate);

/** GET /map/markers — aktīvi objekti ar koordinātām un atvērtiem atgadījumiem */
mapRouter.get('/markers', async (_req, res, next) => {
  try {
    const data = await listMapMarkers();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
