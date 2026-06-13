"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastReadAt = getLastReadAt;
exports.getPortalReadWatermark = getPortalReadWatermark;
exports.getStaffReadWatermark = getStaffReadWatermark;
exports.listIncidentMessagesWithReadState = listIncidentMessagesWithReadState;
exports.assertIncidentExists = assertIncidentExists;
exports.listIncidentMessages = listIncidentMessages;
exports.addStaffMessage = addStaffMessage;
exports.addPortalMessage = addPortalMessage;
exports.markIncidentRead = markIncidentRead;
exports.countUnreadForPortal = countUnreadForPortal;
exports.countUnreadForStaff = countUnreadForStaff;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const portalScope_1 = require("./portalScope");
const portalPermissions_1 = require("./portalPermissions");
async function getLastReadAt(incidentId, readerType, readerId) {
    const row = await (0, pool_1.queryOne)(`SELECT last_read_at FROM incident_message_reads
     WHERE incident_id = ? AND reader_type = ? AND reader_id = ?`, [incidentId, readerType, readerId]);
    return row?.last_read_at ?? null;
}
async function getPortalReadWatermark(incidentId, portalUserId) {
    const row = await (0, pool_1.queryOne)(`SELECT GREATEST(
      COALESCE(
        (SELECT last_read_at FROM incident_message_reads
         WHERE incident_id = ? AND reader_type = 'portal' AND reader_id = ?),
        '1970-01-01 00:00:00'
      ),
      COALESCE(
        (SELECT MAX(created_at) FROM incident_messages
         WHERE incident_id = ? AND author_type = 'portal' AND author_portal_id = ?),
        '1970-01-01 00:00:00'
      )
    ) AS watermark`, [incidentId, portalUserId, incidentId, portalUserId]);
    return row?.watermark ?? '1970-01-01 00:00:00';
}
async function getStaffReadWatermark(incidentId, staffUserId) {
    const row = await (0, pool_1.queryOne)(`SELECT GREATEST(
      COALESCE(
        (SELECT last_read_at FROM incident_message_reads
         WHERE incident_id = ? AND reader_type = 'staff' AND reader_id = ?),
        '1970-01-01 00:00:00'
      ),
      COALESCE(
        (SELECT MAX(created_at) FROM incident_messages
         WHERE incident_id = ? AND author_type = 'staff' AND author_staff_id = ?),
        '1970-01-01 00:00:00'
      )
    ) AS watermark`, [incidentId, staffUserId, incidentId, staffUserId]);
    return row?.watermark ?? '1970-01-01 00:00:00';
}
async function listIncidentMessagesWithReadState(incidentId, readerType, readerId) {
    const messages = await listIncidentMessages(incidentId);
    const cutoff = readerType === 'portal'
        ? await getPortalReadWatermark(incidentId, readerId)
        : await getStaffReadWatermark(incidentId, readerId);
    const unreadFrom = readerType === 'portal' ? 'staff' : 'portal';
    return messages.map((m) => ({
        ...m,
        is_unread: m.author_type === unreadFrom && m.created_at > cutoff,
    }));
}
async function assertIncidentExists(incidentId) {
    const row = await (0, pool_1.queryOne)('SELECT id FROM incidents WHERE id = ?', [incidentId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
}
async function listIncidentMessages(incidentId) {
    return (0, pool_1.query)(`SELECT id, incident_id, author_type, author_name, body, created_at
     FROM incident_messages
     WHERE incident_id = ?
     ORDER BY created_at ASC`, [incidentId]);
}
async function addStaffMessage(incidentId, staffUserId, body) {
    await assertIncidentExists(incidentId);
    const user = await (0, pool_1.queryOne)('SELECT full_name FROM users WHERE id = ? AND is_active = 1', [staffUserId]);
    if (!user)
        throw new errorHandler_1.AppError(403, 'Lietotājs nav aktīvs', 'FORBIDDEN');
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO incident_messages (id, incident_id, author_type, author_staff_id, author_name, body)
     VALUES (?, ?, 'staff', ?, ?, ?)`, [id, incidentId, staffUserId, user.full_name, body.trim()]);
    const message = await (0, pool_1.queryOne)('SELECT id, incident_id, author_type, author_name, body, created_at FROM incident_messages WHERE id = ?', [id]);
    await markIncidentRead(incidentId, 'staff', staffUserId);
    return message;
}
async function addPortalMessage(incidentId, portalUserId, grants, body) {
    await (0, portalScope_1.assertCanViewIncident)(grants, incidentId);
    await (0, portalPermissions_1.assertPortalCanSendChat)(grants, incidentId);
    const user = await (0, pool_1.queryOne)('SELECT full_name FROM portal_users WHERE id = ? AND is_active = 1', [portalUserId]);
    if (!user)
        throw new errorHandler_1.AppError(403, 'Lietotājs nav aktīvs', 'FORBIDDEN');
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO incident_messages (id, incident_id, author_type, author_portal_id, author_name, body)
     VALUES (?, ?, 'portal', ?, ?, ?)`, [id, incidentId, portalUserId, user.full_name, body.trim()]);
    const message = await (0, pool_1.queryOne)('SELECT id, incident_id, author_type, author_name, body, created_at FROM incident_messages WHERE id = ?', [id]);
    await markIncidentRead(incidentId, 'portal', portalUserId);
    return message;
}
async function markIncidentRead(incidentId, readerType, readerId) {
    const maxRow = await (0, pool_1.queryOne)('SELECT MAX(created_at) AS latest FROM incident_messages WHERE incident_id = ?', [incidentId]);
    const readAt = maxRow?.latest ?? new Date().toISOString().slice(0, 19).replace('T', ' ');
    await (0, pool_1.query)(`INSERT INTO incident_message_reads (incident_id, reader_type, reader_id, last_read_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_read_at = GREATEST(last_read_at, VALUES(last_read_at))`, [incidentId, readerType, readerId, readAt]);
}
async function countUnreadForPortal(incidentId, portalUserId) {
    const watermark = await getPortalReadWatermark(incidentId, portalUserId);
    const row = await (0, pool_1.queryOne)(`SELECT COUNT(*) AS total FROM incident_messages m
     WHERE m.incident_id = ?
       AND m.author_type = 'staff'
       AND m.created_at > ?`, [incidentId, watermark]);
    return row?.total ?? 0;
}
async function countUnreadForStaff(incidentId, staffUserId) {
    const watermark = await getStaffReadWatermark(incidentId, staffUserId);
    const row = await (0, pool_1.queryOne)(`SELECT COUNT(*) AS total FROM incident_messages m
     WHERE m.incident_id = ?
       AND m.author_type = 'portal'
       AND m.created_at > ?`, [incidentId, watermark]);
    return row?.total ?? 0;
}
//# sourceMappingURL=incidentMessages.js.map