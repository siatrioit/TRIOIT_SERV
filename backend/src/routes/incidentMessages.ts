import { Router, type Request } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import {
  addStaffMessage,
  listIncidentMessagesWithReadState,
  markIncidentRead,
} from '../services/incidentMessages';

type Params = { incidentId: string };

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const incidentMessagesRouter = Router({ mergeParams: true });

incidentMessagesRouter.use(authenticate);

incidentMessagesRouter.get('/', async (req: Request<Params>, res, next) => {
  try {
    const { incidentId } = req.params;
    const messages = await listIncidentMessagesWithReadState(
      incidentId,
      'staff',
      req.user!.userId
    );
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
});

incidentMessagesRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req: Request<Params>, res, next) => {
    try {
      const { incidentId } = req.params;
      const { body } = messageSchema.parse(req.body);
      const message = await addStaffMessage(incidentId, req.user!.userId, body);
      res.status(201).json({ data: message });
    } catch (err) {
      next(err);
    }
  }
);

incidentMessagesRouter.post('/read', async (req: Request<Params>, res, next) => {
  try {
    const { incidentId } = req.params;
    await markIncidentRead(incidentId, 'staff', req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
