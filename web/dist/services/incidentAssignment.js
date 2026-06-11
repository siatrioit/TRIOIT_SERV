"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssignableStaff = listAssignableStaff;
exports.listAssignableStaffUserIds = listAssignableStaffUserIds;
exports.assertAssignableUser = assertAssignableUser;
exports.getObjectDefaultAssignee = getObjectDefaultAssignee;
exports.resolveIncidentAssignee = resolveIncidentAssignee;
exports.isAssignableRole = isAssignableRole;
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const ASSIGNABLE_ROLES = ['admin', 'manager', 'technician'];
async function listAssignableStaff() {
    return (0, pool_1.query)(`SELECT id, full_name, role
     FROM users
     WHERE is_active = 1 AND role IN ('admin', 'manager', 'technician')
     ORDER BY full_name ASC`);
}
async function listAssignableStaffUserIds() {
    const rows = await listAssignableStaff();
    return rows.map((row) => row.id);
}
async function assertAssignableUser(userId) {
    const user = await (0, pool_1.queryOne)(`SELECT id, full_name, role
     FROM users
     WHERE id = ? AND is_active = 1 AND role IN ('admin', 'manager', 'technician')`, [userId]);
    if (!user) {
        throw new errorHandler_1.AppError(400, 'Lietotājs nav pieejams piešķiršanai', 'INVALID_ASSIGNEE');
    }
    return user;
}
async function getObjectDefaultAssignee(objectId) {
    if (!objectId)
        return null;
    const row = await (0, pool_1.queryOne)(`SELECT co.assigned_user_id
     FROM client_objects co
     WHERE co.id = ? AND co.is_active = 1`, [objectId]);
    if (!row?.assigned_user_id)
        return null;
    const user = await (0, pool_1.queryOne)(`SELECT id FROM users
     WHERE id = ? AND is_active = 1 AND role IN ('admin', 'manager', 'technician')`, [row.assigned_user_id]);
    return user?.id ?? null;
}
/** Ja nav norādīts explicit — ņem no objekta; viewer netiek piešķirts */
async function resolveIncidentAssignee(objectId, explicitAssignedTo) {
    if (explicitAssignedTo) {
        const user = await assertAssignableUser(explicitAssignedTo);
        return user.id;
    }
    return getObjectDefaultAssignee(objectId);
}
function isAssignableRole(role) {
    return ASSIGNABLE_ROLES.includes(role);
}
//# sourceMappingURL=incidentAssignment.js.map