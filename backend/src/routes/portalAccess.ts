import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { createPortalAccessSchema } from '../schemas/portalAccess';
import {
  grantClientPortalAccess,
  grantObjectPortalAccess,
  listPortalAccess,
  revokePortalAccess,
} from '../services/portalAccess';

type ClientParams = { clientId: string };
type ObjectParams = { clientId: string; objectId: string };

export const clientPortalAccessRouter = Router({ mergeParams: true });
export const objectPortalAccessRouter = Router({ mergeParams: true });
export const portalAccessRouter = Router();

clientPortalAccessRouter.use(authenticate);
objectPortalAccessRouter.use(authenticate);
portalAccessRouter.use(authenticate);

clientPortalAccessRouter.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { clientId } = req.params as ClientParams;
    const rows = await listPortalAccess(clientId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

clientPortalAccessRouter.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { clientId } = req.params as ClientParams;
    const body = createPortalAccessSchema.parse(req.body);
    const result = await grantClientPortalAccess(clientId, body, req.user?.userId);
    res.status(201).json({
      data: result.access,
      temporary_password: result.temporaryPassword,
    });
  } catch (err) {
    next(err);
  }
});

objectPortalAccessRouter.get(
  '/',
  authorize('admin', 'manager'),
  async (req: Request<ObjectParams>, res, next) => {
    try {
      const { clientId, objectId } = req.params;
      const rows = await listPortalAccess(clientId, objectId);
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

objectPortalAccessRouter.post(
  '/',
  authorize('admin', 'manager'),
  async (req: Request<ObjectParams>, res, next) => {
    try {
      const { clientId, objectId } = req.params;
      const body = createPortalAccessSchema.parse(req.body);
      const result = await grantObjectPortalAccess(clientId, objectId, body, req.user?.userId);
      res.status(201).json({
        data: result.access,
        temporary_password: result.temporaryPassword,
      });
    } catch (err) {
      next(err);
    }
  }
);

portalAccessRouter.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    await revokePortalAccess(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
