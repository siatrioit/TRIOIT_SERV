"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pushNotifications_1 = require("../services/pushNotifications");
exports.pushRouter = (0, express_1.Router)();
exports.pushRouter.use(auth_1.authenticate);
exports.pushRouter.get('/config', (0, auth_1.authorize)('admin', 'manager', 'technician'), (_req, res) => {
    const publicKey = (0, pushNotifications_1.getVapidPublicKey)();
    res.json({
        data: {
            enabled: (0, pushNotifications_1.isPushConfigured)(),
            publicKey: publicKey ?? null,
        },
    });
});
const subscribeSchema = zod_1.z.object({
    endpoint: zod_1.z.string().url(),
    keys: zod_1.z.object({
        p256dh: zod_1.z.string().min(1),
        auth: zod_1.z.string().min(1),
    }),
});
exports.pushRouter.post('/subscribe', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        if (!(0, pushNotifications_1.isPushConfigured)()) {
            throw new errorHandler_1.AppError(503, 'Push paziņojumi nav konfigurēti serverī', 'PUSH_DISABLED');
        }
        const body = subscribeSchema.parse(req.body);
        await (0, pushNotifications_1.upsertPushSubscription)(req.user.userId, body.endpoint, body.keys.p256dh, body.keys.auth, req.headers['user-agent']);
        res.status(201).json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
const unsubscribeSchema = zod_1.z.object({
    endpoint: zod_1.z.string().url(),
});
exports.pushRouter.delete('/subscribe', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = unsubscribeSchema.parse(req.body);
        await (0, pushNotifications_1.removePushSubscription)(req.user.userId, body.endpoint);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=push.js.map