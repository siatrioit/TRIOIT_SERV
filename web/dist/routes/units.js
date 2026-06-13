"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
const units_1 = require("../services/units");
const unitActivity_1 = require("../services/unitActivity");
const unit_1 = require("../schemas/unit");
exports.unitsRouter = (0, express_1.Router)();
exports.unitsRouter.use(auth_1.authenticate);
async function actorFromReq(req) {
    const user = req.user;
    if (!user)
        return null;
    return {
        userId: user.userId,
        userName: await (0, unitActivity_1.resolveStaffActorName)(user.userId),
    };
}
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
        OR c.name LIKE ? OR co.name LIKE ? OR ac.name LIKE ?
      )`;
            params.push(term, term, term, term, term, term);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       ${where}`, params);
        const units = await (0, pool_1.query)(`SELECT u.*, c.name AS client_name, co.name AS object_name,
              at.name AS asset_type_name, at.code AS asset_type_code,
              ac.name AS asset_component_name,
              pu.serial_number AS parent_serial_number,
              (SELECT COUNT(*) FROM incidents i
               INNER JOIN incident_statuses st ON st.code = i.status AND st.category = 'open' AND st.is_active = 1
               WHERE i.unit_id = u.id) AS open_incident_count
       FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       LEFT JOIN units pu ON pu.id = u.parent_unit_id
       ${where}
       ORDER BY
         c.name ASC,
         co.name ASC,
         CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
         COALESCE(pu.serial_number, u.serial_number) ASC,
         u.serial_number ASC
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
exports.unitsRouter.get('/:id/activity', async (req, res, next) => {
    try {
        const unit = await (0, pool_1.queryOne)('SELECT id FROM units WHERE id = ?', [req.params.id]);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found');
        const activity = await (0, unitActivity_1.listUnitActivity)(req.params.id);
        res.json({ data: activity });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.get('/:id', async (req, res, next) => {
    try {
        const unit = await (0, pool_1.queryOne)(`SELECT u.*, at.name AS asset_type_name, ac.name AS asset_component_name,
              pu.serial_number AS parent_serial_number
       FROM units u
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       LEFT JOIN units pu ON pu.id = u.parent_unit_id
       WHERE u.id = ?`, [req.params.id]);
        if (!unit)
            throw new errorHandler_1.AppError(404, 'Unit not found');
        res.json({ data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.unitsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = unit_1.unitUpdateSchema.parse(req.body);
        const existing = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [req.params.id]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Unit not found');
        if (!existing.object_id) {
            throw new errorHandler_1.AppError(400, 'Aktīvam jābūt piesaistītam objektam', 'INVALID_UNIT');
        }
        const actor = await actorFromReq(req);
        const unit = await (0, units_1.updateUnitForObject)(existing.client_id, existing.object_id, req.params.id, body, actor);
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
        const actor = await actorFromReq(req);
        await (0, units_1.deleteUnitForObject)(unit.client_id, unit.object_id, unit.id, actor);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=units.js.map