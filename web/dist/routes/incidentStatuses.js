"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIncidentStatusesRouter = exports.incidentStatusesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const incidentStatuses_1 = require("../services/incidentStatuses");
exports.incidentStatusesRouter = (0, express_1.Router)();
exports.incidentStatusesRouter.use(auth_1.authenticate);
exports.incidentStatusesRouter.get('/', async (_req, res, next) => {
    try {
        const data = await (0, incidentStatuses_1.listIncidentStatuses)(true);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupIncidentStatusesRouter = (0, express_1.Router)();
exports.setupIncidentStatusesRouter.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
exports.setupIncidentStatusesRouter.get('/', async (_req, res, next) => {
    try {
        const data = await (0, incidentStatuses_1.listIncidentStatuses)(false);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupIncidentStatusesRouter.post('/', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            label: zod_1.z.string().min(1).max(100),
            code: zod_1.z.string().min(1).max(50).optional(),
            category: zod_1.z.enum(['open', 'closed']).optional(),
            sort_order: zod_1.z.number().int().optional(),
            badge_tone: zod_1.z.string().max(30).nullable().optional(),
            sync_unit_status: zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']).nullable().optional(),
            sync_activity_label: zod_1.z.string().max(100).nullable().optional(),
        })
            .parse(req.body);
        const data = await (0, incidentStatuses_1.createIncidentStatus)(body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupIncidentStatusesRouter.put('/:id', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            label: zod_1.z.string().min(1).max(100).optional(),
            category: zod_1.z.enum(['open', 'closed']).optional(),
            sort_order: zod_1.z.number().int().optional(),
            badge_tone: zod_1.z.string().max(30).nullable().optional(),
            sync_unit_status: zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']).nullable().optional(),
            sync_activity_label: zod_1.z.string().max(100).nullable().optional(),
            is_active: zod_1.z.boolean().optional(),
        })
            .parse(req.body);
        const data = await (0, incidentStatuses_1.updateIncidentStatus)(req.params.id, body);
        if (!data)
            throw new errorHandler_1.AppError(404, 'Statuss nav atrasts', 'NOT_FOUND');
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupIncidentStatusesRouter.delete('/:id', async (req, res, next) => {
    try {
        await (0, incidentStatuses_1.deleteIncidentStatus)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidentStatuses.js.map