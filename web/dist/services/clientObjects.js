"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countObjectIncidents = countObjectIncidents;
exports.listClientObjects = listClientObjects;
exports.getClientObject = getClientObject;
exports.insertClientObject = insertClientObject;
exports.updateClientObject = updateClientObject;
exports.closeClientObject = closeClientObject;
exports.reopenClientObject = reopenClientObject;
exports.deleteClientObject = deleteClientObject;
exports.syncClientObjects = syncClientObjects;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
async function countObjectIncidents(objectId) {
    const row = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incidents WHERE object_id = ?', [objectId]);
    return row?.total ?? 0;
}
async function listClientObjects(clientId, status = 'active') {
    return (0, pool_1.query)(`SELECT co.*,
      (SELECT COUNT(*) FROM incidents i WHERE i.object_id = co.id) AS incident_count
     FROM client_objects co
     WHERE co.client_id = ? AND co.is_active = 1 AND co.status = ?
     ORDER BY co.name ASC`, [clientId, status]);
}
async function getClientObject(clientId, objectId) {
    return (0, pool_1.queryOne)(`SELECT co.*,
      (SELECT COUNT(*) FROM incidents i WHERE i.object_id = co.id) AS incident_count
     FROM client_objects co
     WHERE co.id = ? AND co.client_id = ? AND co.is_active = 1`, [objectId, clientId]);
}
async function insertClientObject(clientId, input, createdBy) {
    const id = input.id ?? (0, uuid_1.v4)();
    if (input.is_primary) {
        await (0, pool_1.query)(`UPDATE client_objects SET is_primary = 0
       WHERE client_id = ? AND status = 'active'`, [clientId]);
    }
    await (0, pool_1.query)(`INSERT INTO client_objects (
      id, client_id, name, object_code, address, city, postal_code, country,
      latitude, longitude, contact_name, contact_phone, contact_email,
      access_notes, notes, is_primary, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`, [
        id,
        clientId,
        input.name,
        input.object_code ?? null,
        input.address ?? null,
        input.city ?? null,
        input.postal_code ?? null,
        input.country ?? 'LV',
        input.latitude ?? null,
        input.longitude ?? null,
        input.contact_name ?? null,
        input.contact_phone ?? null,
        input.contact_email || null,
        input.access_notes ?? null,
        input.notes ?? null,
        input.is_primary ? 1 : 0,
        createdBy ?? null,
    ]);
    const row = await (0, pool_1.queryOne)('SELECT * FROM client_objects WHERE id = ?', [id]);
    return row;
}
async function updateClientObject(clientId, objectId, input) {
    const existing = await (0, pool_1.queryOne)(`SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1 AND status = 'active'`, [objectId, clientId]);
    if (!existing)
        return null;
    if (input.is_primary) {
        await (0, pool_1.query)(`UPDATE client_objects SET is_primary = 0
       WHERE client_id = ? AND status = 'active'`, [clientId]);
    }
    const fields = Object.keys(input).filter((k) => k !== 'id');
    if (fields.length === 0) {
        return (0, pool_1.queryOne)('SELECT * FROM client_objects WHERE id = ?', [objectId]);
    }
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => {
        const v = input[f];
        if (f === 'is_primary')
            return v ? 1 : 0;
        if (f === 'contact_email' && v === '')
            return null;
        return v ?? null;
    });
    await (0, pool_1.query)(`UPDATE client_objects SET ${setClause} WHERE id = ? AND client_id = ?`, [...values, objectId, clientId]);
    return (0, pool_1.queryOne)('SELECT * FROM client_objects WHERE id = ?', [objectId]);
}
async function closeClientObject(clientId, objectId) {
    const existing = await getClientObject(clientId, objectId);
    if (!existing || existing.status === 'closed')
        return null;
    await (0, pool_1.query)(`UPDATE client_objects SET status = 'closed', is_primary = 0
     WHERE id = ? AND client_id = ?`, [objectId, clientId]);
    return (0, pool_1.queryOne)('SELECT * FROM client_objects WHERE id = ?', [objectId]);
}
async function reopenClientObject(clientId, objectId) {
    const existing = await getClientObject(clientId, objectId);
    if (!existing || existing.status !== 'closed')
        return null;
    await (0, pool_1.query)(`UPDATE client_objects SET status = 'active' WHERE id = ? AND client_id = ?`, [objectId, clientId]);
    return (0, pool_1.queryOne)('SELECT * FROM client_objects WHERE id = ?', [objectId]);
}
async function deleteClientObject(clientId, objectId) {
    const existing = await getClientObject(clientId, objectId);
    if (!existing) {
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
    }
    const incidents = await countObjectIncidents(objectId);
    if (incidents > 0) {
        throw new errorHandler_1.AppError(409, 'Objektu nevar dzēst — ir saistīti izsaukumi. Slēdziet objektu.', 'HAS_INCIDENTS');
    }
    await (0, pool_1.query)('DELETE FROM client_objects WHERE id = ? AND client_id = ?', [objectId, clientId]);
}
async function syncClientObjects(clientId, objects, createdBy) {
    const existing = await listClientObjects(clientId, 'active');
    const keepIds = new Set(objects.map((o) => o.id).filter((id) => Boolean(id)));
    for (const row of existing) {
        if (!keepIds.has(row.id)) {
            await closeClientObject(clientId, row.id);
        }
    }
    const result = [];
    for (const obj of objects) {
        if (obj.id && keepIds.has(obj.id)) {
            const updated = await updateClientObject(clientId, obj.id, obj);
            if (updated)
                result.push(updated);
        }
        else {
            const { id: _id, ...rest } = obj;
            result.push(await insertClientObject(clientId, rest, createdBy));
        }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}
//# sourceMappingURL=clientObjects.js.map