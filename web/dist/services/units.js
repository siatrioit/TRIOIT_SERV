"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertObjectForClient = assertObjectForClient;
exports.listUnitsForObject = listUnitsForObject;
exports.getUnitForObject = getUnitForObject;
exports.createUnitForObject = createUnitForObject;
exports.updateUnitForObject = updateUnitForObject;
exports.deleteUnitForObject = deleteUnitForObject;
exports.listPortalUnitsForObject = listPortalUnitsForObject;
exports.assertUnitForIncident = assertUnitForIncident;
exports.unitLabel = unitLabel;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
async function assertObjectForClient(clientId, objectId) {
    const row = await (0, pool_1.queryOne)(`SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`, [objectId, clientId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
}
async function listUnitsForObject(clientId, objectId) {
    await assertObjectForClient(clientId, objectId);
    return (0, pool_1.query)(`SELECT * FROM units
     WHERE client_id = ? AND object_id = ?
     ORDER BY unit_type ASC, serial_number ASC`, [clientId, objectId]);
}
async function getUnitForObject(clientId, objectId, unitId) {
    return (0, pool_1.queryOne)(`SELECT * FROM units WHERE id = ? AND client_id = ? AND object_id = ?`, [unitId, clientId, objectId]);
}
async function createUnitForObject(clientId, objectId, input) {
    await assertObjectForClient(clientId, objectId);
    const dup = await (0, pool_1.queryOne)('SELECT id FROM units WHERE serial_number = ?', [
        input.serial_number,
    ]);
    if (dup) {
        throw new errorHandler_1.AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
    }
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO units (
      id, client_id, object_id, unit_type, serial_number, model, manufacturer,
      status, location_note, installed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        clientId,
        objectId,
        input.unit_type,
        input.serial_number.trim(),
        input.model ?? null,
        input.manufacturer ?? null,
        input.status,
        input.location_note ?? null,
        input.installed_at || null,
        input.notes ?? null,
    ]);
    const unit = await (0, pool_1.queryOne)('SELECT * FROM units WHERE id = ?', [id]);
    return unit;
}
async function updateUnitForObject(clientId, objectId, unitId, input) {
    const existing = await getUnitForObject(clientId, objectId, unitId);
    if (!existing)
        return null;
    if (input.serial_number && input.serial_number !== existing.serial_number) {
        const dup = await (0, pool_1.queryOne)('SELECT id FROM units WHERE serial_number = ? AND id != ?', [
            input.serial_number,
            unitId,
        ]);
        if (dup) {
            throw new errorHandler_1.AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
        }
    }
    const fields = Object.keys(input);
    if (fields.length === 0)
        return existing;
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => {
        const v = input[f];
        if (f === 'serial_number' && typeof v === 'string')
            return v.trim();
        return v ?? null;
    });
    await (0, pool_1.query)(`UPDATE units SET ${setClause} WHERE id = ?`, [...values, unitId]);
    return getUnitForObject(clientId, objectId, unitId);
}
async function deleteUnitForObject(clientId, objectId, unitId) {
    const existing = await getUnitForObject(clientId, objectId, unitId);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Unit not found', 'NOT_FOUND');
    const incidents = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incidents WHERE unit_id = ?', [unitId]);
    if ((incidents?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Vienību nevar dzēst — ir saistīti izsaukumi. Mainiet statusu uz „Izņemta”.', 'HAS_INCIDENTS');
    }
    await (0, pool_1.query)('DELETE FROM units WHERE id = ?', [unitId]);
}
async function listPortalUnitsForObject(objectId, clientWideIds, objectScopedIds) {
    const object = await (0, pool_1.queryOne)(`SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND is_active = 1 AND status = 'active'`, [objectId]);
    if (!object)
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
    const canAccess = clientWideIds.includes(object.client_id) || objectScopedIds.includes(objectId);
    if (!canAccess)
        throw new errorHandler_1.AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');
    return (0, pool_1.query)(`SELECT * FROM units
     WHERE object_id = ? AND status IN ('active', 'repair')
     ORDER BY unit_type ASC, serial_number ASC`, [objectId]);
}
async function assertUnitForIncident(unitId, clientId, objectId) {
    const unit = await (0, pool_1.queryOne)(`SELECT id FROM units
     WHERE id = ? AND client_id = ? AND object_id = ?
       AND status IN ('active', 'repair')`, [unitId, clientId, objectId]);
    if (!unit) {
        throw new errorHandler_1.AppError(400, 'Ierīce nav pieejama šim objektam', 'INVALID_UNIT');
    }
}
function unitLabel(unit) {
    const typeLabels = {
        computer: 'Dators',
        pos: 'POS',
        printer: 'Printeris',
        network: 'Tīkls',
        other: 'Cits',
    };
    const type = typeLabels[unit.unit_type] || unit.unit_type;
    const model = unit.model ? ` ${unit.model}` : '';
    return `${type}${model} · ${unit.serial_number}`;
}
//# sourceMappingURL=units.js.map