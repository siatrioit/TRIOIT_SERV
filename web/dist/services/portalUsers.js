"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllPortalUsers = listAllPortalUsers;
exports.getPortalUserAdmin = getPortalUserAdmin;
exports.updatePortalUser = updatePortalUser;
exports.resetPortalUserPassword = resetPortalUserPassword;
exports.updatePortalAccessRole = updatePortalAccessRole;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const portalPermissions_1 = require("./portalPermissions");
function generatePassword() {
    return (0, crypto_1.randomBytes)(9).toString('base64url');
}
async function listAllPortalUsers() {
    const users = await (0, pool_1.query)(`SELECT id, email, full_name, phone, is_active, created_at
     FROM portal_users
     ORDER BY full_name ASC`);
    if (users.length === 0)
        return [];
    const accesses = await (0, pool_1.query)(`SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.portal_role,
            c.name AS client_name, co.name AS object_name
     FROM portal_access pa
     JOIN clients c ON c.id = pa.client_id
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.is_active = 1
     ORDER BY c.name ASC, co.name ASC`);
    const byUser = new Map();
    for (const row of accesses) {
        const list = byUser.get(row.portal_user_id) ?? [];
        list.push({
            id: row.id,
            client_id: row.client_id,
            client_name: row.client_name,
            object_id: row.object_id,
            object_name: row.object_name,
            scope: row.scope,
            portal_role: (0, portalPermissions_1.normalizePortalRole)(row.portal_role),
        });
        byUser.set(row.portal_user_id, list);
    }
    return users.map((user) => ({
        ...user,
        access: byUser.get(user.id) ?? [],
    }));
}
async function getPortalUserAdmin(id) {
    const users = await listAllPortalUsers();
    return users.find((u) => u.id === id) ?? null;
}
async function updatePortalUser(id, input) {
    const existing = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE id = ?', [id]);
    if (!existing)
        return null;
    if (input.email) {
        const taken = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE email = ? AND id != ?', [
            input.email,
            id,
        ]);
        if (taken)
            throw new errorHandler_1.AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');
        const staffTaken = await (0, pool_1.queryOne)('SELECT id FROM users WHERE email = ?', [input.email]);
        if (staffTaken)
            throw new errorHandler_1.AppError(409, 'E-pasts jau izmantots darbinieku kontā', 'EMAIL_EXISTS');
    }
    const fields = Object.keys(input).filter((k) => input[k] !== undefined);
    if (fields.length > 0) {
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = fields.map((f) => {
            const v = input[f];
            return f === 'is_active' ? (v ? 1 : 0) : (v ?? null);
        });
        await (0, pool_1.query)(`UPDATE portal_users SET ${setClause} WHERE id = ?`, [...values, id]);
    }
    return getPortalUserAdmin(id);
}
async function resetPortalUserPassword(id, password) {
    const existing = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE id = ?', [id]);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');
    const newPassword = password?.trim() || generatePassword();
    if (newPassword.length < 8) {
        throw new errorHandler_1.AppError(400, 'Parolei jābūt vismaz 8 rakstzīmēm', 'INVALID_PASSWORD');
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await (0, pool_1.query)('UPDATE portal_users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    return newPassword;
}
async function updatePortalAccessRole(accessId, portalRole) {
    const row = await (0, pool_1.queryOne)('SELECT id FROM portal_access WHERE id = ? AND is_active = 1', [
        accessId,
    ]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Pieeja nav atrasta', 'NOT_FOUND');
    await (0, pool_1.query)('UPDATE portal_access SET portal_role = ? WHERE id = ?', [portalRole, accessId]);
}
//# sourceMappingURL=portalUsers.js.map