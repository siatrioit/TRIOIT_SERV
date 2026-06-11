"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientObjectsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const clientObject_1 = require("../schemas/clientObject");
const clientObjects_1 = require("../services/clientObjects");
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
        const objects = await (0, clientObjects_1.listClientObjects)(clientId);
        res.json({ data: objects });
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
exports.clientObjectsRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, id } = req.params;
        await assertClient(clientId);
        await (0, pool_1.query)('UPDATE client_objects SET is_active = 0 WHERE id = ? AND client_id = ?', [id, clientId]);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=clientObjects.js.map