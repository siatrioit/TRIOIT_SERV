import { Router, type Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  addWorkLog,
  deleteWorkLog,
  listWorkLogs,
} from '../services/incidentWork';
import { workLogInputSchema } from '../schemas/warehouse';

type Params = { incidentId: string };

export const incidentWorkLogsRouter = Router({ mergeParams: true });
incidentWorkLogsRouter.use(authenticate);

incidentWorkLogsRouter.get('/', async (req: Request<Params>, res, next) => {
  try {
    const logs = await listWorkLogs(req.params.incidentId);
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
});

incidentWorkLogsRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<Params>, res, next) => {
    try {
      const body = workLogInputSchema.parse(req.body);
      const log = await addWorkLog(req.params.incidentId, body, req.user!.userId);
      res.status(201).json({ data: log });
    } catch (err) {
      next(err);
    }
  }
);

incidentWorkLogsRouter.delete(
  '/:workLogId',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<Params & { workLogId: string }>, res, next) => {
    try {
      await deleteWorkLog(req.params.incidentId, req.params.workLogId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
