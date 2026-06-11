"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentMessagesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const incidentMessages_1 = require("../services/incidentMessages");
const messageSchema = zod_1.z.object({
    body: zod_1.z.string().min(1).max(5000),
});
exports.incidentMessagesRouter = (0, express_1.Router)({ mergeParams: true });
exports.incidentMessagesRouter.use(auth_1.authenticate);
exports.incidentMessagesRouter.get('/', async (req, res, next) => {
    try {
        const { incidentId } = req.params;
        const messages = await (0, incidentMessages_1.listIncidentMessages)(incidentId);
        res.json({ data: messages });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentMessagesRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { incidentId } = req.params;
        const { body } = messageSchema.parse(req.body);
        const message = await (0, incidentMessages_1.addStaffMessage)(incidentId, req.user.userId, body);
        res.status(201).json({ data: message });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentMessagesRouter.post('/read', async (req, res, next) => {
    try {
        const { incidentId } = req.params;
        await (0, incidentMessages_1.markIncidentRead)(incidentId, 'staff', req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidentMessages.js.map