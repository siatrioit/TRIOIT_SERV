import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getVapidPublicKey,
  isPushConfigured,
  removePushSubscription,
  upsertPushSubscription,
} from '../services/pushNotifications';

export const pushRouter = Router();

pushRouter.use(authenticate);

pushRouter.get('/config', authorize('admin', 'manager', 'technician'), (_req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({
    data: {
      enabled: isPushConfigured(),
      publicKey: publicKey ?? null,
    },
  });
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

pushRouter.post('/subscribe', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    if (!isPushConfigured()) {
      throw new AppError(503, 'Push paziņojumi nav konfigurēti serverī', 'PUSH_DISABLED');
    }

    const body = subscribeSchema.parse(req.body);
    await upsertPushSubscription(
      req.user!.userId,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
      req.headers['user-agent']
    );

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

pushRouter.delete('/subscribe', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = unsubscribeSchema.parse(req.body);
    await removePushSubscription(req.user!.userId, body.endpoint);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
