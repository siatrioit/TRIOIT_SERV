"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateIncidentStatusCache = invalidateIncidentStatusCache;
exports.listIncidentStatuses = listIncidentStatuses;
exports.getOpenStatusCodes = getOpenStatusCodes;
exports.getClosedStatusCodes = getClosedStatusCodes;
exports.assertValidIncidentStatus = assertValidIncidentStatus;
exports.getDefaultIncidentStatusCode = getDefaultIncidentStatusCode;
exports.isClosedIncidentStatus = isClosedIncidentStatus;
exports.createIncidentStatus = createIncidentStatus;
exports.updateIncidentStatus = updateIncidentStatus;
exports.deleteIncidentStatus = deleteIncidentStatus;
exports.statusByCode = statusByCode;
exports.sqlInActiveStatusCodes = sqlInActiveStatusCodes;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const VALID_UNIT_STATUSES = ['active', 'repair', 'decommissioned', 'spare'];
let cache = null;
let cacheAt = 0;
const CACHE_MS = 30_000;
function slugifyCode(name) {
    return (name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'status');
}
function invalidateIncidentStatusCache() {
    cache = null;
    cacheAt = 0;
}
async function listIncidentStatuses(activeOnly = true) {
    const useCache = activeOnly && cache && Date.now() - cacheAt < CACHE_MS;
    if (useCache)
        return cache;
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const rows = await (0, pool_1.query)(`SELECT * FROM incident_statuses ${where} ORDER BY sort_order ASC, label ASC`);
    if (activeOnly) {
        cache = rows;
        cacheAt = Date.now();
    }
    return rows;
}
async function getOpenStatusCodes() {
    const rows = await listIncidentStatuses(true);
    return rows.filter((r) => r.category === 'open').map((r) => r.code);
}
async function getClosedStatusCodes() {
    const rows = await listIncidentStatuses(true);
    return rows.filter((r) => r.category === 'closed').map((r) => r.code);
}
async function assertValidIncidentStatus(code) {
    const row = await (0, pool_1.queryOne)('SELECT * FROM incident_statuses WHERE code = ? AND is_active = 1', [code]);
    if (!row) {
        throw new errorHandler_1.AppError(400, 'Nederīgs atgadījuma statuss', 'INVALID_STATUS');
    }
    return row;
}
async function getDefaultIncidentStatusCode() {
    const rows = await listIncidentStatuses(true);
    const pending = rows.find((r) => r.code === 'pending');
    return pending?.code ?? rows[0]?.code ?? 'pending';
}
async function isClosedIncidentStatus(code) {
    const row = await (0, pool_1.queryOne)('SELECT category FROM incident_statuses WHERE code = ? AND is_active = 1', [code]);
    return row?.category === 'closed';
}
async function createIncidentStatus(input) {
    let code = input.code?.trim() || slugifyCode(input.label);
    const existingCode = await (0, pool_1.queryOne)('SELECT id FROM incident_statuses WHERE code = ?', [code]);
    if (existingCode) {
        code = `${code}_${Date.now().toString(36).slice(-4)}`;
    }
    if (input.sync_unit_status && !VALID_UNIT_STATUSES.includes(input.sync_unit_status)) {
        throw new errorHandler_1.AppError(400, 'Nederīgs aktīva statuss', 'INVALID_UNIT_STATUS');
    }
    const id = (0, uuid_1.v4)();
    const sortOrder = input.sort_order ??
        (await (0, pool_1.queryOne)('SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM incident_statuses'))
            ?.next ??
        10;
    await (0, pool_1.query)(`INSERT INTO incident_statuses (id, code, label, category, sort_order, badge_tone, sync_unit_status, sync_activity_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        code,
        input.label.trim(),
        input.category ?? 'open',
        sortOrder,
        input.badge_tone ?? 'gray',
        input.sync_unit_status ?? null,
        input.sync_activity_label?.trim() || null,
    ]);
    invalidateIncidentStatusCache();
    return (await (0, pool_1.queryOne)('SELECT * FROM incident_statuses WHERE id = ?', [id]));
}
async function updateIncidentStatus(id, input) {
    const existing = await (0, pool_1.queryOne)('SELECT * FROM incident_statuses WHERE id = ?', [id]);
    if (!existing)
        return null;
    if (input.sync_unit_status && !VALID_UNIT_STATUSES.includes(input.sync_unit_status)) {
        throw new errorHandler_1.AppError(400, 'Nederīgs aktīva statuss', 'INVALID_UNIT_STATUS');
    }
    const updates = {};
    if (input.label !== undefined)
        updates.label = input.label.trim();
    if (input.category !== undefined)
        updates.category = input.category;
    if (input.sort_order !== undefined)
        updates.sort_order = input.sort_order;
    if (input.badge_tone !== undefined)
        updates.badge_tone = input.badge_tone;
    if (input.sync_unit_status !== undefined)
        updates.sync_unit_status = input.sync_unit_status;
    if (input.sync_activity_label !== undefined) {
        updates.sync_activity_label = input.sync_activity_label?.trim() || null;
    }
    if (input.is_active !== undefined)
        updates.is_active = input.is_active ? 1 : 0;
    const fields = Object.keys(updates);
    if (fields.length === 0)
        return existing;
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    await (0, pool_1.query)(`UPDATE incident_statuses SET ${setClause} WHERE id = ?`, [
        ...fields.map((f) => updates[f] ?? null),
        id,
    ]);
    invalidateIncidentStatusCache();
    return (0, pool_1.queryOne)('SELECT * FROM incident_statuses WHERE id = ?', [id]);
}
async function deleteIncidentStatus(id) {
    const row = await (0, pool_1.queryOne)('SELECT * FROM incident_statuses WHERE id = ?', [id]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Statuss nav atrasts', 'NOT_FOUND');
    const inUse = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incidents WHERE status = ?', [row.code]);
    if ((inUse?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Statusu nevar dzēst — ir saistīti atgadījumi. Varat deaktivizēt.', 'STATUS_IN_USE');
    }
    await (0, pool_1.query)('DELETE FROM incident_statuses WHERE id = ?', [id]);
    invalidateIncidentStatusCache();
}
function statusByCode(rows) {
    return new Map(rows.map((r) => [r.code, r]));
}
const FALLBACK_OPEN = ['pending', 'in_progress', 'paused'];
const FALLBACK_CLOSED = ['completed', 'cancelled'];
async function sqlInActiveStatusCodes(category) {
    const rows = await listIncidentStatuses(true);
    let codes;
    if (category === 'open') {
        codes = rows.filter((r) => r.category === 'open').map((r) => r.code);
        if (codes.length === 0)
            codes = [...FALLBACK_OPEN];
    }
    else if (category === 'closed') {
        codes = rows.filter((r) => r.category === 'closed').map((r) => r.code);
        if (codes.length === 0)
            codes = [...FALLBACK_CLOSED];
    }
    else {
        codes = rows.map((r) => r.code);
    }
    return { fragment: codes.map(() => '?').join(', '), codes };
}
//# sourceMappingURL=incidentStatuses.js.map