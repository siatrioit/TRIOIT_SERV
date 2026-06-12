"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPortalAccess = listPortalAccess;
exports.grantClientPortalAccess = grantClientPortalAccess;
exports.grantObjectPortalAccess = grantObjectPortalAccess;
exports.revokePortalAccess = revokePortalAccess;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
function generatePassword() {
    return (0, crypto_1.randomBytes)(9).toString('base64url');
}
async function listPortalAccess(clientId, objectId) {
    if (objectId) {
        return (0, pool_1.query)(`SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.portal_role, pa.is_active,
              pa.created_at, pu.email, pu.full_name, pu.phone, pu.is_active AS user_active,
              co.name AS object_name
       FROM portal_access pa
       JOIN portal_users pu ON pu.id = pa.portal_user_id
       LEFT JOIN client_objects co ON co.id = pa.object_id
       WHERE pa.client_id = ? AND pa.object_id = ? AND pa.is_active = 1
       ORDER BY pu.full_name ASC`, [clientId, objectId]);
    }
    return (0, pool_1.query)(`SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.portal_role, pa.is_active,
            pa.created_at, pu.email, pu.full_name, pu.phone, pu.is_active AS user_active,
            co.name AS object_name
     FROM portal_access pa
     JOIN portal_users pu ON pu.id = pa.portal_user_id
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.client_id = ? AND pa.is_active = 1
     ORDER BY pa.scope ASC, pu.full_name ASC`, [clientId]);
}
async function findOrCreatePortalUser(input, createdBy) {
    const existing = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE email = ?', [
        input.email,
    ]);
    if (existing) {
        return { userId: existing.id };
    }
    const staffExisting = await (0, pool_1.queryOne)('SELECT id FROM users WHERE email = ?', [input.email]);
    if (staffExisting) {
        throw new errorHandler_1.AppError(409, 'E-pasts jau izmantots darbinieku kontā', 'EMAIL_EXISTS');
    }
    const temporaryPassword = input.password ?? generatePassword();
    const passwordHash = await bcryptjs_1.default.hash(temporaryPassword, 10);
    const userId = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO portal_users (id, email, password_hash, full_name, phone, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`, [userId, input.email, passwordHash, input.full_name, input.phone ?? null, createdBy ?? null]);
    return input.password ? { userId } : { userId, temporaryPassword };
}
async function assertAccessNotDuplicate(portalUserId, clientId, scope, objectId) {
    if (scope === 'client') {
        const dup = await (0, pool_1.queryOne)(`SELECT id FROM portal_access
       WHERE portal_user_id = ? AND client_id = ? AND scope = 'client' AND is_active = 1`, [portalUserId, clientId]);
        if (dup) {
            throw new errorHandler_1.AppError(409, 'Lietotājam jau ir pieeja visam klientam', 'ACCESS_EXISTS');
        }
        return;
    }
    const dup = await (0, pool_1.queryOne)(`SELECT id FROM portal_access
     WHERE portal_user_id = ? AND client_id = ? AND object_id = ? AND is_active = 1`, [portalUserId, clientId, objectId]);
    if (dup) {
        throw new errorHandler_1.AppError(409, 'Lietotājam jau ir pieeja šim objektam', 'ACCESS_EXISTS');
    }
}
async function grantClientPortalAccess(clientId, input, createdBy) {
    const client = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
        clientId,
    ]);
    if (!client)
        throw new errorHandler_1.AppError(404, 'Client not found', 'NOT_FOUND');
    const { userId, temporaryPassword } = await findOrCreatePortalUser(input, createdBy);
    await assertAccessNotDuplicate(userId, clientId, 'client');
    const accessId = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO portal_access (id, portal_user_id, client_id, scope, portal_role, created_by)
     VALUES (?, ?, ?, 'client', ?, ?)`, [accessId, userId, clientId, input.portal_role ?? 'operator', createdBy ?? null]);
    const rows = await listPortalAccess(clientId);
    const access = rows.find((r) => r.id === accessId);
    if (!access)
        throw new errorHandler_1.AppError(500, 'Failed to load access');
    return { access, temporaryPassword };
}
async function grantObjectPortalAccess(clientId, objectId, input, createdBy) {
    const object = await (0, pool_1.queryOne)(`SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`, [objectId, clientId]);
    if (!object)
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
    const { userId, temporaryPassword } = await findOrCreatePortalUser(input, createdBy);
    await assertAccessNotDuplicate(userId, clientId, 'object', objectId);
    const accessId = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO portal_access (id, portal_user_id, client_id, object_id, scope, portal_role, created_by)
     VALUES (?, ?, ?, ?, 'object', ?, ?)`, [accessId, userId, clientId, objectId, input.portal_role ?? 'operator', createdBy ?? null]);
    const rows = await listPortalAccess(clientId, objectId);
    const access = rows.find((r) => r.id === accessId);
    if (!access)
        throw new errorHandler_1.AppError(500, 'Failed to load access');
    return { access, temporaryPassword };
}
async function revokePortalAccess(accessId) {
    const row = await (0, pool_1.queryOne)('SELECT id FROM portal_access WHERE id = ? AND is_active = 1', [
        accessId,
    ]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Access not found', 'NOT_FOUND');
    await (0, pool_1.query)('UPDATE portal_access SET is_active = 0 WHERE id = ?', [accessId]);
}
//# sourceMappingURL=portalAccess.js.map