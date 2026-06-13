"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIncidentActivity = logIncidentActivity;
exports.logIncidentCreated = logIncidentCreated;
exports.logIncidentStatusChanged = logIncidentStatusChanged;
exports.logIncidentAssigned = logIncidentAssigned;
exports.listIncidentActivity = listIncidentActivity;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const incidentStatuses_1 = require("./incidentStatuses");
async function statusLabel(code) {
    const rows = await (0, incidentStatuses_1.listIncidentStatuses)(true);
    return rows.find((r) => r.code === code)?.label ?? code;
}
async function logIncidentActivity(incidentId, action, description, actor, metadata) {
    await (0, pool_1.query)(`INSERT INTO incident_activity_log (id, incident_id, action, description, actor_user_id, actor_name, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        (0, uuid_1.v4)(),
        incidentId,
        action,
        description,
        actor?.userId ?? null,
        actor?.userName ?? null,
        metadata ? JSON.stringify(metadata) : null,
    ]);
}
async function logIncidentCreated(incidentId, statusCode, actor) {
    const label = await statusLabel(statusCode);
    await logIncidentActivity(incidentId, 'created', `Reģistrēts atgadījums · statuss: ${label}`, actor, { status: statusCode });
}
async function logIncidentStatusChanged(incidentId, fromStatus, toStatus, actor, resolution) {
    const [fromLabel, toLabel] = await Promise.all([
        statusLabel(fromStatus),
        statusLabel(toStatus),
    ]);
    let description = `Statuss: ${fromLabel} → ${toLabel}`;
    if (resolution?.trim()) {
        description += ` · ${resolution.trim()}`;
    }
    await logIncidentActivity(incidentId, 'status_changed', description, actor, {
        from_status: fromStatus,
        to_status: toStatus,
        resolution: resolution?.trim() || null,
    });
}
async function logIncidentAssigned(incidentId, assigneeName, actor) {
    await logIncidentActivity(incidentId, 'assigned', `Piešķirts: ${assigneeName}`, actor, { assignee_name: assigneeName });
}
async function listIncidentActivity(incidentId) {
    return (0, pool_1.query)(`SELECT id, incident_id, action, description, actor_user_id, actor_name, metadata, created_at
     FROM incident_activity_log
     WHERE incident_id = ?
     ORDER BY created_at DESC
     LIMIT 200`, [incidentId]);
}
//# sourceMappingURL=incidentActivity.js.map