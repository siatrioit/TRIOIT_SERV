import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { clientObjectSchema } from '../schemas/clientObject';
import {
  insertClientObject,
  listClientObjects,
  updateClientObject,
} from '../services/clientObjects';

export const clientObjectsRouter = Router({ mergeParams: true });

clientObjectsRouter.use(authenticate);

async function assertClient(clientId: string) {
  const client = await queryOne('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
    clientId,
  ]);
  if (!client) throw new AppError(404, 'Client not found', 'NOT_FOUND');
}

clientObjectsRouter.get('/', async (req, res, next) => {
  try {
    const clientId = req.params.clientId as string;
    await assertClient(clientId);
    const objects = await listClientObjects(clientId);
    res.json({ data: objects });
  } catch (err) {
    next(err);
  }
});

clientObjectsRouter.post('/', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const clientId = req.params.clientId as string;
    await assertClient(clientId);
    const body = clientObjectSchema.parse(req.body);
    const object = await insertClientObject(clientId, body, req.user?.userId);
    res.status(201).json({ data: object });
  } catch (err) {
    next(err);
  }
});

clientObjectsRouter.put('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const clientId = req.params.clientId as string;
    await assertClient(clientId);
    const body = clientObjectSchema.partial().parse(req.body);
    const object = await updateClientObject(clientId, req.params.id, body);
    if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');
    res.json({ data: object });
  } catch (err) {
    next(err);
  }
});

clientObjectsRouter.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const clientId = req.params.clientId as string;
    await assertClient(clientId);
    await query(
      'UPDATE client_objects SET is_active = 0 WHERE id = ? AND client_id = ?',
      [req.params.id, clientId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
