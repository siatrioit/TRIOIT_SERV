"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStaffActorName = resolveStaffActorName;
exports.logUnitActivity = logUnitActivity;
exports.listUnitActivity = listUnitActivity;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
async function resolveStaffActorName(userId) {
    const row = await (0, pool_1.queryOne)('SELECT full_name FROM users WHERE id = ?', [userId]);
    return row?.full_name ?? 'Darbinieks';
}
async function logUnitActivity(unitId, action, description, actor, metadata) {
    await (0, pool_1.query)(`INSERT INTO unit_activity_log (id, unit_id, action, description, actor_user_id, actor_name, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        (0, uuid_1.v4)(),
        unitId,
        action,
        description,
        actor?.userId ?? null,
        actor?.userName ?? null,
        metadata ? JSON.stringify(metadata) : null,
    ]);
}
async function listUnitActivity(unitId) {
    return (0, pool_1.query)(`SELECT id, unit_id, action, description, actor_user_id, actor_name, metadata, created_at
     FROM unit_activity_log
     WHERE unit_id = ?
     ORDER BY created_at DESC
     LIMIT 200`, [unitId]);
}
//# sourceMappingURL=unitActivity.js.map