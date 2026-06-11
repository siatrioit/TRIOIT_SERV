import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { listMapMarkers, saveMapMarkerCoords } from '../services/mapMarkers';

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

/** PATCH /map/markers/:objectId/coordinates — saglabā ģeokodētās koordinātas */
mapRouter.patch(
  '/markers/:objectId/coordinates',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
        .parse(req.body);

      await saveMapMarkerCoords(req.params.objectId, body.latitude, body.longitude);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
