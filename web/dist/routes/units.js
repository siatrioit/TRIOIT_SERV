"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
exports.unitsRouter = (0, express_1.Router)();
exports.unitsRouter.use(auth_1.authenticate);
const unitSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    contract_id: zod_1.z.string().uuid().optional(),
    unit_type: zod_1.z.enum(['computer', 'pos', 'printer', 'network', 'other']).default('other'),
    serial_number: zod_1.z.string().min(1).max(100),
    model: zod_1.z.string().optional(),
    manufacturer: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']).default('active'),
    location_note: zod_1.z.string().optional(),
    installed_at: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.unitsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const clientId = req.query.client_id;
        const serial = req.query.serial_number;
        let where = 'WHERE 1=1';
        const params = [];
        if (clientId) {
            where += ' AND client_id = ?';
            params.push(clientId);
        }
        if (serial) {
            where += ' AND serial_number LIKE ?';
            params.push(`%${serial}%`);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM units ${where}`, params);
        const units = await (0, pool_1.query)(`SELECT * FROM units ${where} ORDER BY serial_number ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        res.json({
            data: units,
            pagination: (0, pagination_1.buildPaginationMeta)(countRow?.total ?? 0, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.get('/:id', async (req, res, next) => {
    try {
        const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found');
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = unitSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO units (id, client_id, contract_id, unit_type, serial_number, model,
        manufacturer, status, location_note, installed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, body.client_id, body.contract_id, body.unit_type, body.serial_number,
            body.model, body.manufacturer, body.status, body.location_note,
            body.installed_at, body.notes,
        ]);
        const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [id]);
        res.status(201).json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = unitSchema.partial().parse(req.body);
        const fields = Object.keys(body);
        if (fields.length === 0)
            throw new errorHandler_1.AppError(400, 'No fields to update');
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        await (0, pool_1.query)(`UPDATE units SET ${setClause} WHERE id = ?`, [...fields.map((f) => body[f]), req.params.id]);
        const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=units.js.map