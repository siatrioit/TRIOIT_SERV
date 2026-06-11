"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClientObjects = listClientObjects;
exports.insertClientObject = insertClientObject;
exports.updateClientObject = updateClientObject;
exports.syncClientObjects = syncClientObjects;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
async function listClientObjects(clientId) {
    return (0, pool_1.query)(`SELECT * FROM client_objects
     WHERE client_id = ? AND is_active = 1
     ORDER BY is_primary DESC, name ASC`, [clientId]);
}
async function insertClientObject(clientId, input, createdBy) {
    const id = input.id ?? (0, uuid_1.v4)();
    if (input.is_primary) {
        await (0, pool_1.query)('UPDATE client_objects SET is_primary = 0 WHERE client_id = ?', [clientId]);
    }
    await (0, pool_1.query)(`INSERT INTO client_objects (
      id, client_id, name, object_code, address, city, postal_code, country,
      latitude, longitude, contact_name, contact_phone, contact_email,
      access_notes, notes, is_primary, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
    const existing = await (0, pool_1.queryOne)('SELECT id FROM client_objects WHERE id = ? AND client_id = ? AND is_active = 1', [objectId, clientId]);
    if (!existing)
        return null;
    if (input.is_primary) {
        await (0, pool_1.query)('UPDATE client_objects SET is_primary = 0 WHERE client_id = ?', [clientId]);
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
async function syncClientObjects(clientId, objects, createdBy) {
    const existing = await listClientObjects(clientId);
    const keepIds = new Set(objects.map((o) => o.id).filter((id) => Boolean(id)));
    for (const row of existing) {
        if (!keepIds.has(row.id)) {
            await (0, pool_1.query)('UPDATE client_objects SET is_active = 0 WHERE id = ? AND client_id = ?', [row.id, clientId]);
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
    return result.sort((a, b) => {
        const aPrimary = Boolean(a.is_primary);
        const bPrimary = Boolean(b.is_primary);
        if (aPrimary !== bPrimary)
            return aPrimary ? -1 : 1;
        return a.name.localeCompare(b.name, 'lv');
    });
}
//# sourceMappingURL=clientObjects.js.map