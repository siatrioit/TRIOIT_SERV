"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectUnitsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const unit_1 = require("../schemas/unit");
const units_1 = require("../services/units");
exports.objectUnitsRouter = (0, express_1.Router)({ mergeParams: true });
exports.objectUnitsRouter.use(auth_1.authenticate);
exports.objectUnitsRouter.get('/', async (req, res, next) => {
    try {
        const { clientId, objectId } = req.params;
        const units = await (0, units_1.listUnitsForObject)(clientId, objectId);
        res.json({ data: units });
    }
    catch (err) {
        next(err);
    }
});
exports.objectUnitsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { clientId, objectId } = req.params;
        const body = unit_1.unitInputSchema.parse(req.body);
        const unit = await (0, units_1.createUnitForObject)(clientId, objectId, body);
        res.status(201).json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.objectUnitsRouter.put('/:unitId', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { clientId, objectId, unitId } = req.params;
        const body = unit_1.unitUpdateSchema.parse(req.body);
        const unit = await (0, units_1.updateUnitForObject)(clientId, objectId, unitId, body);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found', 'NOT_FOUND');
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.objectUnitsRouter.delete('/:unitId', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, objectId, unitId } = req.params;
        await (0, units_1.deleteUnitForObject)(clientId, objectId, unitId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.objectUnitsRouter.get('/:unitId', async (req, res, next) => {
    try {
        const { clientId, objectId, unitId } = req.params;
        const unit = await (0, units_1.getUnitForObject)(clientId, objectId, unitId);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found', 'NOT_FOUND');
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=objectUnits.js.map