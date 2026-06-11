import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { clientObjectSchema } from '../schemas/clientObject';
import {
  insertClientObject,
  listClientObjects,
  updateClientObject,
} from '../services/clientObjects';

type ClientObjectListParams = { clientId: string };
type ClientObjectItemParams = { clientId: string; id: string };

export const clientObjectsRouter = Router({ mergeParams: true });

clientObjectsRouter.use(authenticate);

async function assertClient(clientId: string) {
  const client = await queryOne('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
    clientId,
  ]);
  if (!client) throw new AppError(404, 'Client not found', 'NOT_FOUND');
}

clientObjectsRouter.get('/', async (req: Request<ClientObjectListParams>, res, next) => {
  try {
    const { clientId } = req.params;
    await assertClient(clientId);
    const objects = await listClientObjects(clientId);
    res.json({ data: objects });
  } catch (err) {
    next(err);
  }
});

clientObjectsRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<ClientObjectListParams>, res, next) => {
    try {
      const { clientId } = req.params;
      await assertClient(clientId);
      const body = clientObjectSchema.parse(req.body);
      const object = await insertClientObject(clientId, body, req.user?.userId);
      res.status(201).json({ data: object });
    } catch (err) {
      next(err);
    }
  }
);

clientObjectsRouter.put(
  '/:id',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<ClientObjectItemParams>, res, next) => {
    try {
      const { clientId, id } = req.params;
      await assertClient(clientId);
      const body = clientObjectSchema.partial().parse(req.body);
      const object = await updateClientObject(clientId, id, body);
      if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');
      res.json({ data: object });
    } catch (err) {
      next(err);
    }
  }
);

clientObjectsRouter.delete(
  '/:id',
  authorize('admin', 'manager'),
  async (req: Request<ClientObjectItemParams>, res, next) => {
    try {
      const { clientId, id } = req.params;
      await assertClient(clientId);
      await query(
        'UPDATE client_objects SET is_active = 0 WHERE id = ? AND client_id = ?',
        [id, clientId]
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
