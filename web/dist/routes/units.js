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
const units_1 = require("../services/units");
const assetTypes_1 = require("../services/assetTypes");
exports.unitsRouter = (0, express_1.Router)();
exports.unitsRouter.use(auth_1.authenticate);
const unitBodySchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    object_id: zod_1.z.string().uuid().optional(),
    contract_id: zod_1.z.string().uuid().optional(),
    asset_type_id: zod_1.z.string().uuid().optional(),
    unit_type: zod_1.z.string().min(1).max(50).optional(),
    asset_component_id: zod_1.z.string().uuid().nullable().optional(),
    serial_number: zod_1.z.string().min(1).max(100),
    model: zod_1.z.string().optional(),
    manufacturer: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']).default('active'),
    location_note: zod_1.z.string().optional(),
    installed_at: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
const unitSchema = unitBodySchema.refine((data) => Boolean(data.asset_type_id || data.unit_type), {
    message: 'Norādiet aktīva tipu',
    path: ['asset_type_id'],
});
exports.unitsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const clientId = req.query.client_id;
        const objectId = req.query.object_id;
        const serial = req.query.serial_number;
        const search = req.query.search;
        let where = 'WHERE c.is_active = 1';
        const params = [];
        if (clientId) {
            where += ' AND u.client_id = ?';
            params.push(clientId);
        }
        if (objectId) {
            where += ' AND u.object_id = ?';
            params.push(objectId);
        }
        if (serial) {
            where += ' AND u.serial_number LIKE ?';
            params.push(`%${serial}%`);
        }
        if (search?.trim()) {
            const term = `%${search.trim()}%`;
            where += ` AND (
        u.serial_number LIKE ? OR u.model LIKE ? OR u.manufacturer LIKE ?
        OR c.name LIKE ? OR co.name LIKE ?
      )`;
            params.push(term, term, term, term, term);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       ${where}`, params);
        const units = await (0, pool_1.query)(`SELECT u.*, c.name AS client_name, co.name AS object_name,
              at.name AS asset_type_name, at.code AS asset_type_code,
              ac.name AS asset_component_name
       FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       ${where}
       ORDER BY c.name ASC, co.name ASC, u.serial_number ASC
       LIMIT ? OFFSET ?`, [...params, limit, offset]);
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
        const assetType = await (0, assetTypes_1.resolveAssetTypeId)(body.asset_type_id, body.unit_type);
        const assetComponentId = await (0, assetTypes_1.resolveAssetComponentId)(body.asset_component_id, assetType.id);
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO units (id, client_id, object_id, contract_id, unit_type, asset_type_id, asset_component_id,
        serial_number, model, manufacturer, status, location_note, installed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, body.client_id, body.object_id ?? null, body.contract_id,
            assetType.code, assetType.id, assetComponentId,
            body.serial_number, body.model, body.manufacturer, body.status, body.location_note,
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
        const body = unitBodySchema.partial().parse(req.body);
        const existing = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Unit not found');
        const payload = { ...body };
        if (body.asset_type_id !== undefined ||
            body.unit_type !== undefined ||
            body.asset_component_id !== undefined) {
            const assetType = await (0, assetTypes_1.resolveAssetTypeId)(body.asset_type_id ?? existing.asset_type_id ?? undefined, body.unit_type ?? existing.unit_type);
            payload.unit_type = assetType.code;
            payload.asset_type_id = assetType.id;
            payload.asset_component_id = await (0, assetTypes_1.resolveAssetComponentId)(body.asset_component_id !== undefined
                ? body.asset_component_id
                : existing.asset_component_id, assetType.id);
        }
        const fields = Object.keys(payload);
        if (fields.length === 0)
            throw new errorHandler_1.AppError(400, 'No fields to update');
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        await (0, pool_1.query)(`UPDATE units SET ${setClause} WHERE id = ?`, [...fields.map((f) => payload[f]), req.params.id]);
        const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found', 'NOT_FOUND');
        if (!unit.object_id) {
            throw new errorHandler_1.AppError(400, 'Aktīvam jābūt piesaistītam objektam', 'INVALID_UNIT');
        }
        await (0, units_1.deleteUnitForObject)(unit.client_id, unit.object_id, unit.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=units.js.map