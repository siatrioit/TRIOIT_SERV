import { Router, type Request } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { clientObjectSchema } from '../schemas/clientObject';
import {
  closeClientObject,
  deleteClientObject,
  getClientObject,
  insertClientObject,
  listClientObjects,
  reopenClientObject,
  updateClientObject,
} from '../services/clientObjects';
import { queryOne } from '../db/pool';

type ClientObjectListParams = { clientId: string };
type ClientObjectItemParams = { clientId: string; id: string };

const deleteConfirmSchema = z.object({ confirm: z.literal('DELETE') });

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
    const status = req.query.status === 'closed' ? 'closed' : 'active';
    const objects = await listClientObjects(clientId, status);
    res.json({ data: objects });
  } catch (err) {
    next(err);
  }
});

clientObjectsRouter.get('/:id', async (req: Request<ClientObjectItemParams>, res, next) => {
  try {
    const { clientId, id } = req.params;
    await assertClient(clientId);
    const object = await getClientObject(clientId, id);
    if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');
    res.json({ data: object });
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

clientObjectsRouter.post(
  '/:id/close',
  authorize('admin', 'manager'),
  async (req: Request<ClientObjectItemParams>, res, next) => {
    try {
      const { clientId, id } = req.params;
      await assertClient(clientId);
      const object = await closeClientObject(clientId, id);
      if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');
      res.json({ data: object });
    } catch (err) {
      next(err);
    }
  }
);

clientObjectsRouter.post(
  '/:id/reopen',
  authorize('admin', 'manager'),
  async (req: Request<ClientObjectItemParams>, res, next) => {
    try {
      const { clientId, id } = req.params;
      await assertClient(clientId);
      const object = await reopenClientObject(clientId, id);
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
      deleteConfirmSchema.parse(req.body);
      await deleteClientObject(clientId, id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
