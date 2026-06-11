"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientObjectsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const clientObject_1 = require("../schemas/clientObject");
const clientObjects_1 = require("../services/clientObjects");
const pool_1 = require("../db/pool");
const deleteConfirmSchema = zod_1.z.object({ confirm: zod_1.z.literal('DELETE') });
exports.clientObjectsRouter = (0, express_1.Router)({ mergeParams: true });
exports.clientObjectsRouter.use(auth_1.authenticate);
async function assertClient(clientId) {
    const client = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
        clientId,
    ]);
    if (!client)
        throw new errorHandler_1.AppError(404, 'Client not found', 'NOT_FOUND');
}
exports.clientObjectsRouter.get('/', async (req, res, next) => {
    try {
        const { clientId } = req.params;
        await assertClient(clientId);
        const status = req.query.status === 'closed' ? 'closed' : 'active';
        const objects = await (0, clientObjects_1.listClientObjects)(clientId, status);
        res.json({ data: objects });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.get('/:id', async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        const object = await (0, clientObjects_1.getClientObject)(clientId, id);
        if (!object)
            throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
        res.json({ data: object });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { clientId } = req.params;
        await assertClient(clientId);
        const body = clientObject_1.clientObjectSchema.parse(req.body);
        const object = await (0, clientObjects_1.insertClientObject)(clientId, body, req.user?.userId);
        res.status(201).json({ data: object });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        const body = clientObject_1.clientObjectSchema.partial().parse(req.body);
        const object = await (0, clientObjects_1.updateClientObject)(clientId, id, body);
        if (!object)
            throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
        res.json({ data: object });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.post('/:id/close', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        const object = await (0, clientObjects_1.closeClientObject)(clientId, id);
        if (!object)
            throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
        res.json({ data: object });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.post('/:id/reopen', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        const object = await (0, clientObjects_1.reopenClientObject)(clientId, id);
        if (!object)
            throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
        res.json({ data: object });
    }
    catch (err) {
        next(err);
    }
});
exports.clientObjectsRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        deleteConfirmSchema.parse(req.body);
        await (0, clientObjects_1.deleteClientObject)(clientId, id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=clientObjects.js.map