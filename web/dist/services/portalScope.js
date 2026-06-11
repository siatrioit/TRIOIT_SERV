"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortalUserAccess = getPortalUserAccess;
exports.buildIncidentScopeClause = buildIncidentScopeClause;
exports.assertCanViewIncident = assertCanViewIncident;
exports.assertCanCreateIncident = assertCanCreateIncident;
exports.assertCanAccessObject = assertCanAccessObject;
exports.listAccessibleObjects = listAccessibleObjects;
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
async function getPortalUserAccess(portalUserId) {
    return (0, pool_1.query)(`SELECT pa.id, pa.client_id, pa.object_id, pa.scope,
            c.name AS client_name, co.name AS object_name
     FROM portal_access pa
     JOIN clients c ON c.id = pa.client_id AND c.is_active = 1
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.portal_user_id = ? AND pa.is_active = 1
       AND EXISTS (SELECT 1 FROM portal_users pu WHERE pu.id = ? AND pu.is_active = 1)`, [portalUserId, portalUserId]);
}
/** SQL nosacījums — kuri atgadījumi redzami portāla lietotājam */
function buildIncidentScopeClause(grants) {
    if (grants.length === 0) {
        return { clause: '1 = 0', params: [] };
    }
    const parts = [];
    const params = [];
    const clientScopeIds = [
        ...new Set(grants.filter((g) => g.scope === 'client').map((g) => g.client_id)),
    ];
    for (const clientId of clientScopeIds) {
        parts.push('i.client_id = ?');
        params.push(clientId);
    }
    const objectScopeIds = [
        ...new Set(grants
            .filter((g) => g.scope === 'object' && g.object_id)
            .map((g) => g.object_id)),
    ];
    if (objectScopeIds.length === 1) {
        parts.push('i.object_id = ?');
        params.push(objectScopeIds[0]);
    }
    else if (objectScopeIds.length > 1) {
        parts.push(`i.object_id IN (${objectScopeIds.map(() => '?').join(', ')})`);
        params.push(...objectScopeIds);
    }
    // Objekta pieeja — arī klienta vispārīgie izsaukumi bez konkrēta objekta
    const objectOnlyClientIds = [
        ...new Set(grants
            .filter((g) => g.scope === 'object')
            .map((g) => g.client_id)
            .filter((cid) => !clientScopeIds.includes(cid))),
    ];
    for (const clientId of objectOnlyClientIds) {
        parts.push('(i.client_id = ? AND i.object_id IS NULL)');
        params.push(clientId);
    }
    return { clause: parts.length ? `(${parts.join(' OR ')})` : '1 = 0', params };
}
async function assertCanViewIncident(grants, incidentId) {
    const { clause, params } = buildIncidentScopeClause(grants);
    const row = await (0, pool_1.queryOne)(`SELECT i.id FROM incidents i WHERE i.id = ? AND ${clause}`, [incidentId, ...params]);
    if (!row) {
        throw new errorHandler_1.AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
    }
}
async function assertCanCreateIncident(grants, clientId, objectId) {
    const object = await (0, pool_1.queryOne)(`SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`, [objectId, clientId]);
    if (!object || object.status !== 'active') {
        throw new errorHandler_1.AppError(400, 'Objekts nav pieejams', 'INVALID_OBJECT');
    }
    const allowed = grants.some((g) => {
        if (g.scope === 'client' && g.client_id === clientId)
            return true;
        if (g.scope === 'object' && g.object_id === objectId)
            return true;
        return false;
    });
    if (!allowed) {
        throw new errorHandler_1.AppError(403, 'Nav tiesību reģistrēt izsaukumu šim objektam', 'FORBIDDEN');
    }
}
async function assertCanAccessObject(grants, objectId) {
    const objects = await listAccessibleObjects(grants);
    if (!objects.some((o) => o.id === objectId)) {
        throw new errorHandler_1.AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');
    }
}
async function listAccessibleObjects(grants) {
    if (grants.length === 0)
        return [];
    const clientIds = [...new Set(grants.filter((g) => g.scope === 'client').map((g) => g.client_id))];
    const objectIds = grants.filter((g) => g.scope === 'object' && g.object_id).map((g) => g.object_id);
    const results = [];
    if (clientIds.length > 0) {
        const placeholders = clientIds.map(() => '?').join(', ');
        const rows = await (0, pool_1.query)(`SELECT id, client_id, name, address, city, object_code, status
       FROM client_objects
       WHERE client_id IN (${placeholders}) AND is_active = 1 AND status = 'active'
       ORDER BY name ASC`, clientIds);
        results.push(...rows);
    }
    if (objectIds.length > 0) {
        const placeholders = objectIds.map(() => '?').join(', ');
        const rows = await (0, pool_1.query)(`SELECT id, client_id, name, address, city, object_code, status
       FROM client_objects
       WHERE id IN (${placeholders}) AND is_active = 1 AND status = 'active'
       ORDER BY name ASC`, objectIds);
        for (const row of rows) {
            if (!results.some((r) => r.id === row.id)) {
                results.push(row);
            }
        }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}
//# sourceMappingURL=portalScope.js.map