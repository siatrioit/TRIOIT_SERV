"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTAL_ROLE_LABELS = void 0;
exports.normalizePortalRole = normalizePortalRole;
exports.isPortalWriterRole = isPortalWriterRole;
exports.portalCanCreateIncident = portalCanCreateIncident;
exports.portalCanSendChat = portalCanSendChat;
exports.assertPortalCanCreateIncident = assertPortalCanCreateIncident;
exports.assertPortalCanSendChat = assertPortalCanSendChat;
exports.portalUserCanWrite = portalUserCanWrite;
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
exports.PORTAL_ROLE_LABELS = {
    viewer: 'Skatītājs',
    operator: 'Operators',
    manager: 'Vadītājs',
};
function normalizePortalRole(role) {
    const value = String(role ?? 'operator').trim().toLowerCase();
    if (value === 'viewer' || value === 'manager')
        return value;
    return 'operator';
}
function isPortalWriterRole(role) {
    return role === 'operator' || role === 'manager';
}
function matchingGrants(grants, clientId, objectId) {
    return grants.filter((g) => {
        if (normalizeScope(g.scope) === 'client' && g.client_id === clientId)
            return true;
        if (objectId && normalizeScope(g.scope) === 'object' && g.object_id === objectId)
            return true;
        return false;
    });
}
function normalizeScope(scope) {
    return String(scope).trim().toLowerCase() === 'client' ? 'client' : 'object';
}
function portalCanCreateIncident(grants, clientId, objectId) {
    return matchingGrants(grants, clientId, objectId).some((g) => isPortalWriterRole(normalizePortalRole(g.portal_role)));
}
function portalCanSendChat(grants, clientId, objectId) {
    return matchingGrants(grants, clientId, objectId).some((g) => isPortalWriterRole(normalizePortalRole(g.portal_role)));
}
function assertPortalCanCreateIncident(grants, clientId, objectId) {
    if (!portalCanCreateIncident(grants, clientId, objectId)) {
        throw new errorHandler_1.AppError(403, 'Nav tiesību reģistrēt izsaukumu', 'FORBIDDEN');
    }
}
async function assertPortalCanSendChat(grants, incidentId) {
    const incident = await (0, pool_1.queryOne)('SELECT client_id, object_id FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) {
        throw new errorHandler_1.AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
    }
    if (!portalCanSendChat(grants, incident.client_id, incident.object_id)) {
        throw new errorHandler_1.AppError(403, 'Nav tiesību rakstīt čatā', 'FORBIDDEN');
    }
}
function portalUserCanWrite(grants) {
    return grants.some((g) => isPortalWriterRole(normalizePortalRole(g.portal_role)));
}
//# sourceMappingURL=portalPermissions.js.map