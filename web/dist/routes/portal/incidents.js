"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalIncidentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const pool_1 = require("../../db/pool");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../utils/pagination");
const portalScope_1 = require("../../services/portalScope");
const incidentMessages_1 = require("../../services/incidentMessages");
const units_1 = require("../../services/units");
const incidentAssignment_1 = require("../../services/incidentAssignment");
const assetTypes_1 = require("../../services/assetTypes");
const pushNotifications_1 = require("../../services/pushNotifications");
exports.portalIncidentsRouter = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    object_id: zod_1.z.string().uuid(),
    unit_id: zod_1.z.string().uuid().optional(),
    asset_component_id: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
});
function generateIncidentNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INC-${date}-${rand}`;
}
const messageSchema = zod_1.z.object({
    body: zod_1.z.string().min(1).max(5000),
});
exports.portalIncidentsRouter.get('/', async (req, res, next) => {
    try {
        const { access, portalUserId } = req.portalUser;
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const status = req.query.status;
        const objectId = req.query.object_id;
        if (objectId) {
            await (0, portalScope_1.assertCanAccessObject)(access, objectId);
        }
        const { clause, params } = await (0, portalScope_1.buildIncidentScopeClause)(access);
        let where = `WHERE ${clause}`;
        const queryParams = [...params];
        if (objectId) {
            where += ' AND i.object_id = ?';
            queryParams.push(objectId);
        }
        if (status === 'open') {
            where += " AND i.status IN ('pending', 'in_progress', 'paused')";
        }
        else if (status === 'closed') {
            where += " AND i.status IN ('completed', 'cancelled')";
        }
        else if (status) {
            where += ' AND i.status = ?';
            queryParams.push(status);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) AS total
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       ${where}`, queryParams);
        const incidents = await (0, pool_1.query)(`SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name,
              (SELECT COUNT(*) FROM incident_messages m
               WHERE m.incident_id = i.id AND m.author_type = 'staff'
               AND m.created_at > COALESCE(
                 (SELECT r.last_read_at FROM incident_message_reads r
                  WHERE r.incident_id = i.id AND r.reader_type = 'portal' AND r.reader_id = ?),
                 '1970-01-01 00:00:00'
               )) AS unread_count
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       ${where}
       ORDER BY i.received_at DESC
       LIMIT ? OFFSET ?`, [...queryParams, portalUserId, limit, offset]);
        res.json({
            data: incidents,
            pagination: (0, pagination_1.buildPaginationMeta)(countRow?.total ?? 0, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.portalIncidentsRouter.get('/:id', async (req, res, next) => {
    try {
        const { access } = req.portalUser;
        await (0, portalScope_1.assertCanViewIncident)(access, req.params.id);
        const incident = await (0, pool_1.queryOne)(`SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`, [req.params.id]);
        if (!incident)
            throw new errorHandler_1.AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
        res.json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.portalIncidentsRouter.post('/', async (req, res, next) => {
    try {
        const { portalUserId, access } = req.portalUser;
        const body = createSchema.parse(req.body);
        await (0, portalScope_1.assertCanCreateIncident)(access, body.client_id, body.object_id);
        if (body.unit_id) {
            await (0, units_1.assertUnitForIncident)(body.unit_id, body.client_id, body.object_id);
        }
        const reporter = await (0, pool_1.queryOne)('SELECT full_name FROM portal_users WHERE id = ?', [portalUserId]);
        const id = (0, uuid_1.v4)();
        const incidentNumber = generateIncidentNumber();
        const assignedTo = await (0, incidentAssignment_1.resolveIncidentAssignee)(body.object_id);
        let assetComponentId = null;
        if (body.asset_component_id) {
            if (!body.unit_id) {
                throw new errorHandler_1.AppError(400, 'Apakšsadaļu var norādīt tikai ar izvēlētu aktīvu', 'INVALID_ASSET_COMPONENT');
            }
            const unitRow = await (0, pool_1.queryOne)('SELECT asset_type_id FROM units WHERE id = ?', [body.unit_id]);
            if (!unitRow?.asset_type_id) {
                throw new errorHandler_1.AppError(400, 'Apakšsadaļa nav derīga', 'INVALID_ASSET_COMPONENT');
            }
            assetComponentId = await (0, assetTypes_1.resolveAssetComponentId)(body.asset_component_id, unitRow.asset_type_id);
        }
        await (0, pool_1.query)(`INSERT INTO incidents (
        id, incident_number, client_id, object_id, unit_id, asset_component_id, reported_by, reported_via,
        title, description, status, priority, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'portal', ?, ?, 'pending', ?, ?)`, [
            id,
            incidentNumber,
            body.client_id,
            body.object_id,
            body.unit_id ?? null,
            assetComponentId,
            reporter?.full_name ?? 'Klienta portāls',
            body.title,
            body.description ?? null,
            body.priority,
            assignedTo,
        ]);
        const incident = await (0, pool_1.queryOne)(`SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`, [id]);
        (0, pushNotifications_1.firePush)(() => (0, pushNotifications_1.notifyNewIncident)({
            incidentId: id,
            incidentNumber,
            title: body.title,
            objectName: incident?.object_name,
            assignedTo,
        }));
        res.status(201).json({ data: incident });
    }
    catch (err) {
        next(err);
    }
});
exports.portalIncidentsRouter.get('/:id/messages', async (req, res, next) => {
    try {
        const { portalUserId, access } = req.portalUser;
        await (0, portalScope_1.assertCanViewIncident)(access, req.params.id);
        const messages = await (0, incidentMessages_1.listIncidentMessagesWithReadState)(req.params.id, 'portal', portalUserId);
        res.json({ data: messages });
    }
    catch (err) {
        next(err);
    }
});
exports.portalIncidentsRouter.post('/:id/messages', async (req, res, next) => {
    try {
        const { portalUserId, access } = req.portalUser;
        const { body } = messageSchema.parse(req.body);
        const message = await (0, incidentMessages_1.addPortalMessage)(req.params.id, portalUserId, access, body);
        const incident = await (0, pool_1.queryOne)('SELECT incident_number, assigned_to FROM incidents WHERE id = ?', [req.params.id]);
        if (incident) {
            (0, pushNotifications_1.firePush)(() => (0, pushNotifications_1.notifyPortalChatMessage)({
                incidentId: req.params.id,
                incidentNumber: incident.incident_number,
                authorName: message.author_name,
                messagePreview: message.body,
                assignedTo: incident.assigned_to,
            }));
        }
        res.status(201).json({ data: message });
    }
    catch (err) {
        next(err);
    }
});
exports.portalIncidentsRouter.post('/:id/read', async (req, res, next) => {
    try {
        const { portalUserId, access } = req.portalUser;
        await (0, portalScope_1.assertCanViewIncident)(access, req.params.id);
        await (0, incidentMessages_1.markIncidentRead)(req.params.id, 'portal', portalUserId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=incidents.js.map