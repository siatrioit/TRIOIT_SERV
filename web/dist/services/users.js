"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaffUsers = listStaffUsers;
exports.getStaffUser = getStaffUser;
exports.createStaffUser = createStaffUser;
exports.updateStaffUser = updateStaffUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
async function listStaffUsers() {
    return (0, pool_1.query)(`SELECT id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at
     FROM users ORDER BY full_name ASC`);
}
async function getStaffUser(id) {
    return (0, pool_1.queryOne)(`SELECT id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at
     FROM users WHERE id = ?`, [id]);
}
async function createStaffUser(input) {
    const existing = await (0, pool_1.queryOne)('SELECT id FROM users WHERE email = ?', [input.email]);
    if (existing) {
        throw new errorHandler_1.AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');
    }
    const portalExisting = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE email = ?', [
        input.email,
    ]);
    if (portalExisting) {
        throw new errorHandler_1.AppError(409, 'E-pasts jau izmantots klientu portālā', 'EMAIL_EXISTS');
    }
    const id = (0, uuid_1.v4)();
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    await (0, pool_1.query)(`INSERT INTO users (id, email, password_hash, full_name, phone, role)
     VALUES (?, ?, ?, ?, ?, ?)`, [id, input.email, passwordHash, input.full_name, input.phone ?? null, input.role]);
    const user = await getStaffUser(id);
    return user;
}
async function updateStaffUser(id, input, actorId) {
    const existing = await getStaffUser(id);
    if (!existing)
        return null;
    if (input.is_active === false && id === actorId) {
        throw new errorHandler_1.AppError(400, 'Nevar deaktivizēt pašu kontu', 'SELF_DEACTIVATE');
    }
    if (input.role && input.role !== 'admin' && existing.role === 'admin') {
        const adminCount = await (0, pool_1.queryOne)(`SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 1`);
        if ((adminCount?.total ?? 0) <= 1) {
            throw new errorHandler_1.AppError(400, 'Jāpaliek vismaz vienam administratoram', 'LAST_ADMIN');
        }
    }
    if (input.email && input.email !== existing.email) {
        const emailTaken = await (0, pool_1.queryOne)('SELECT id FROM users WHERE email = ? AND id != ?', [
            input.email,
            id,
        ]);
        if (emailTaken) {
            throw new errorHandler_1.AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');
        }
        const portalTaken = await (0, pool_1.queryOne)('SELECT id FROM portal_users WHERE email = ?', [
            input.email,
        ]);
        if (portalTaken) {
            throw new errorHandler_1.AppError(409, 'E-pasts jau izmantots klientu portālā', 'EMAIL_EXISTS');
        }
    }
    const fields = Object.keys(input).filter((k) => input[k] !== undefined);
    if (fields.length === 0)
        return existing;
    const setParts = [];
    const values = [];
    for (const field of fields) {
        if (field === 'password') {
            const hash = await bcryptjs_1.default.hash(input.password, 10);
            setParts.push('password_hash = ?');
            values.push(hash);
            continue;
        }
        setParts.push(`${field} = ?`);
        const v = input[field];
        values.push(field === 'is_active' ? (v ? 1 : 0) : (v ?? null));
    }
    await (0, pool_1.query)(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`, [...values, id]);
    return getStaffUser(id);
}
//# sourceMappingURL=users.js.map