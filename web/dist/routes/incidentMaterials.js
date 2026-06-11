"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentMaterialsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const incidentWork_1 = require("../services/incidentWork");
const warehouse_1 = require("../schemas/warehouse");
exports.incidentMaterialsRouter = (0, express_1.Router)({ mergeParams: true });
exports.incidentMaterialsRouter.use(auth_1.authenticate);
exports.incidentMaterialsRouter.get('/', async (req, res, next) => {
    try {
        const materials = await (0, incidentWork_1.listIncidentMaterials)(req.params.incidentId);
        res.json({ data: materials });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentMaterialsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = warehouse_1.incidentMaterialInputSchema.parse(req.body);
        const material = await (0, incidentWork_1.addIncidentMaterial)(req.params.incidentId, body, req.user.userId);
        res.status(201).json({ data: material });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentMaterialsRouter.delete('/:materialId', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        await (0, incidentWork_1.deleteIncidentMaterial)(req.params.incidentId, req.params.materialId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidentMaterials.js.map