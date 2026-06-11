"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentWorkLogsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const incidentWork_1 = require("../services/incidentWork");
const warehouse_1 = require("../schemas/warehouse");
exports.incidentWorkLogsRouter = (0, express_1.Router)({ mergeParams: true });
exports.incidentWorkLogsRouter.use(auth_1.authenticate);
exports.incidentWorkLogsRouter.get('/', async (req, res, next) => {
    try {
        const logs = await (0, incidentWork_1.listWorkLogs)(req.params.incidentId);
        res.json({ data: logs });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentWorkLogsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = warehouse_1.workLogInputSchema.parse(req.body);
        const log = await (0, incidentWork_1.addWorkLog)(req.params.incidentId, body, req.user.userId);
        res.status(201).json({ data: log });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentWorkLogsRouter.delete('/:workLogId', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        await (0, incidentWork_1.deleteWorkLog)(req.params.incidentId, req.params.workLogId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidentWorkLogs.js.map