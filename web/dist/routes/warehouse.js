"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const warehouseCommercial_1 = require("./warehouseCommercial");
const warehouse_1 = require("../services/warehouse");
const warehouse_2 = require("../schemas/warehouse");
exports.warehouseRouter = (0, express_1.Router)();
exports.warehouseRouter.use(auth_1.authenticate);
exports.warehouseRouter.use(warehouseCommercial_1.warehouseCommercialRouter);
exports.warehouseRouter.get('/', async (req, res, next) => {
    try {
        const search = req.query.search;
        const items = await (0, warehouse_1.listWarehouseItems)(search);
        res.json({ data: items });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = warehouse_2.warehouseItemInputSchema.parse(req.body);
        const item = await (0, warehouse_1.createWarehouseItem)(body, req.user?.userId);
        res.status(201).json({ data: item });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = warehouse_2.warehouseItemInputSchema.partial().parse(req.body);
        const item = await (0, warehouse_1.updateWarehouseItem)(req.params.id, body);
        res.json({ data: item });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseRouter.post('/:id/stock-in', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = warehouse_2.warehouseStockInSchema.parse(req.body);
        const item = await (0, warehouse_1.stockIn)(req.params.id, body, req.user?.userId);
        res.json({ data: item });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseRouter.get('/:id/movements', async (req, res, next) => {
    try {
        const movements = await (0, warehouse_1.listMovements)(req.params.id);
        res.json({ data: movements });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=warehouse.js.map