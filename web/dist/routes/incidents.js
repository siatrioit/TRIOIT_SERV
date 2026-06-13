"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
const incidentLocation_1 = require("../services/incidentLocation");
const incidentAssignment_1 = require("../services/incidentAssignment");
const incidentMessages_1 = require("../services/incidentMessages");
const pushNotifications_1 = require("../services/pushNotifications");
const assetTypes_1 = require("../services/assetTypes");
exports.incidentsRouter = (0, express_1.Router)();
exports.incidentsRouter.use(auth_1.authenticate);
const incidentSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    object_id: zod_1.z.string().uuid().optional(),
    unit_id: zod_1.z.string().uuid().optional(),
    contract_id: zod_1.z.string().uuid().optional(),
    reported_by: zod_1.z.string().optional(),
    reported_via: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']).default('pending'),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    due_at: zod_1.z.string().optional(),
    resolution: zod_1.z.string().optional(),
    assigned_to: zod_1.z.string().uuid().optional(),
    asset_component_id: zod_1.z.string().uuid().optional().nullable(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    voice_transcript: zod_1.z.string().optional(),
    ai_confidence: zod_1.z.number().min(0).max(1).optional(),
    ai_metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
function generateIncidentNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INC-${date}-${rand}`;
}
/** GET /incidents — ar filtriem: status, priority, city, assigned_to */
exports.incidentsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const status = req.query.status;
        const priority = req.query.priority;
        const city = req.query.city;
        const assignedTo = req.query.assigned_to;
        let where = 'WHERE 1=1';
        const params = [];
        let join = '';
        if (city) {
            join = ' JOIN clients c ON incidents.client_id = c.id';
            where += ' AND c.city = ?';
            params.push(city);
        }
        if (status === 'open') {
            where += " AND incidents.status IN ('pending', 'in_progress', 'paused')";
        }
        else if (status === 'closed') {
            where += " AND incidents.status IN ('completed', 'cancelled')";
        }
        else if (status) {
            where += ' AND incidents.status = ?';
            params.push(status);
        }
        if (priority) {
            where += ' AND incidents.priority = ?';
            params.push(priority);
        }
        if (assignedTo) {
            where += ' AND incidents.assigned_to = ?';
            params.push(assignedTo);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM incidents${join} ${where}`, params);
        const staffUserId = req.user.userId;
        const incidents = await (0, pool_1.query)(`SELECT incidents.*,
        (SELECT COUNT(*) FROM incident_messages m
         WHERE m.incident_id = incidents.id AND m.author_type = 'portal'
         AND m.created_at > COALESCE(
           (SELECT r.last_read_at FROM incident_message_reads r
            WHERE r.incident_id = incidents.id AND r.reader_type = 'staff' AND r.reader_id = ?),
           '1970-01-01 00:00:00'
         )) AS unread_count
       FROM incidents${join} ${where}
       ORDER BY incidents.received_at DESC LIMIT ? OFFSET ?`, [...params, staffUserId, limit, offset]);
        res.json({
            data: incidents,
            pagination: (0, pagination_1.buildPaginationMeta)(countRow?.total ?? 0, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentsRouter.get('/:id', async (req, res, next) => {
    try {
        const incident = await (0, pool_1.queryOne)(`SELECT i.*, co.name AS object_name,
              au.full_name AS assigned_user_name,
              u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`, [req.params.id]);
        if (!incident)
            throw new errorHandler_1.AppError(404, 'Incident not found');
        res.json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = incidentSchema.parse(req.body);
        const location = await (0, incidentLocation_1.resolveIncidentLocation)(body);
        const assignedTo = await (0, incidentAssignment_1.resolveIncidentAssignee)(location.object_id, body.assigned_to);
        let assetComponentId = null;
        if (body.asset_component_id) {
            const unitRow = location.unit_id
                ? await (0, pool_1.queryOne)('SELECT asset_type_id FROM units WHERE id = ?', [location.unit_id])
                : null;
            if (!unitRow?.asset_type_id) {
                throw new errorHandler_1.AppError(400, 'Apakšsadaļu var norādīt tikai ar izvēlētu aktīvu', 'INVALID_ASSET_COMPONENT');
            }
            assetComponentId = await (0, assetTypes_1.resolveAssetComponentId)(body.asset_component_id, unitRow.asset_type_id);
        }
        const id = (0, uuid_1.v4)();
        const incidentNumber = generateIncidentNumber();
        await (0, pool_1.query)(`INSERT INTO incidents (id, incident_number, client_id, object_id, unit_id, asset_component_id, contract_id,
        reported_by, reported_via, title, description, status, priority, due_at,
        assigned_to, latitude, longitude, voice_transcript, ai_confidence, ai_metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, incidentNumber, location.client_id, location.object_id, location.unit_id,
            assetComponentId,
            body.contract_id ?? null,
            body.reported_by ?? null, body.reported_via || 'web', body.title, body.description ?? null,
            body.status, body.priority, body.due_at ?? null, assignedTo,
            body.latitude ?? null, body.longitude ?? null, body.voice_transcript ?? null,
            body.ai_confidence ?? null, body.ai_metadata ? JSON.stringify(body.ai_metadata) : null,
            req.user?.userId ?? null,
        ]);
        const incident = await (0, pool_1.queryOne)(`SELECT i.*, co.name AS object_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       WHERE i.id = ?`, [id]);
        (0, pushNotifications_1.firePush)(() => (0, pushNotifications_1.notifyNewIncident)({
            incidentId: id,
            incidentNumber,
            title: body.title,
            objectName: incident?.object_name,
            assignedTo,
            excludeUserId: req.user?.userId ?? null,
        }));
        res.status(201).json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentsRouter.patch('/:id/assign', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { assigned_to: assignedTo } = zod_1.z.object({
            assigned_to: zod_1.z.string().uuid(),
        }).parse(req.body);
        const existing = await (0, pool_1.queryOne)('SELECT id, assigned_to FROM incidents WHERE id = ?', [req.params.id]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Incident not found');
        const assignee = await (0, incidentAssignment_1.assertAssignableUser)(assignedTo);
        if (existing.assigned_to === assignee.id) {
            const incident = await (0, pool_1.queryOne)(`SELECT i.*, co.name AS object_name, au.full_name AS assigned_user_name
         FROM incidents i
         LEFT JOIN client_objects co ON co.id = i.object_id
         LEFT JOIN users au ON au.id = i.assigned_to
         WHERE i.id = ?`, [req.params.id]);
            return res.json({ data: incident });
        }
        await (0, pool_1.query)('UPDATE incidents SET assigned_to = ? WHERE id = ?', [assignee.id, req.params.id]);
        const staffUserId = req.user.userId;
        await (0, incidentMessages_1.addStaffMessage)(req.params.id, staffUserId, `Izsaukums pārvirzīts lietotājam ${assignee.full_name}.`);
        const incident = await (0, pool_1.queryOne)(`SELECT i.*, co.name AS object_name, au.full_name AS assigned_user_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       WHERE i.id = ?`, [req.params.id]);
        (0, pushNotifications_1.firePush)(() => (0, pushNotifications_1.notifyIncidentReassigned)({
            incidentId: req.params.id,
            incidentNumber: incident.incident_number,
            title: incident.title,
            assigneeId: assignee.id,
            excludeUserId: staffUserId,
        }));
        res.json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentsRouter.patch('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            asset_component_id: zod_1.z.string().uuid().nullable().optional(),
        })
            .parse(req.body);
        const existing = await (0, pool_1.queryOne)('SELECT id, unit_id FROM incidents WHERE id = ?', [req.params.id]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Incident not found');
        if (body.asset_component_id === undefined) {
            throw new errorHandler_1.AppError(400, 'Nav ko atjaunināt', 'NO_FIELDS');
        }
        let assetComponentId = null;
        if (body.asset_component_id) {
            const unitRow = existing.unit_id
                ? await (0, pool_1.queryOne)('SELECT asset_type_id FROM units WHERE id = ?', [existing.unit_id])
                : null;
            if (!unitRow?.asset_type_id) {
                throw new errorHandler_1.AppError(400, 'Apakšsadaļu var norādīt tikai ar piesaistītu aktīvu', 'INVALID_ASSET_COMPONENT');
            }
            assetComponentId = await (0, assetTypes_1.resolveAssetComponentId)(body.asset_component_id, unitRow.asset_type_id);
        }
        await (0, pool_1.query)('UPDATE incidents SET asset_component_id = ? WHERE id = ?', [
            assetComponentId,
            req.params.id,
        ]);
        const incident = await (0, pool_1.queryOne)(`SELECT i.*, co.name AS object_name,
              au.full_name AS assigned_user_name,
              u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`, [req.params.id]);
        res.json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.incidentsRouter.patch('/:id/status', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { status, resolution } = zod_1.z.object({
            status: zod_1.z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']),
            resolution: zod_1.z.string().optional(),
        }).parse(req.body);
        const completedAt = status === 'completed' ? new Date().toISOString() : null;
        await (0, pool_1.query)('UPDATE incidents SET status = ?, resolution = ?, completed_at = ? WHERE id = ?', [status, resolution, completedAt, req.params.id]);
        const incident = await (0, pool_1.queryOne)('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
        res.json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidents.js.map