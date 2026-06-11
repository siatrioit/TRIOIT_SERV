"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPEN_STATUSES = void 0;
exports.saveMapMarkerCoords = saveMapMarkerCoords;
exports.listMapMarkers = listMapMarkers;
const pool_1 = require("../db/pool");
const geocode_1 = require("./geocode");
const OPEN_STATUSES = ['pending', 'in_progress', 'paused'];
exports.OPEN_STATUSES = OPEN_STATUSES;
function parseCoord(value) {
    if (value == null || value === '')
        return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}
function pick(...values) {
    for (const v of values) {
        const t = v?.trim();
        if (t)
            return t;
    }
    return null;
}
function resolveLocationParts(row) {
    return {
        address: pick(row.object_address, row.client_address),
        city: pick(row.object_city, row.client_city),
        postal_code: pick(row.object_postal_code, row.client_postal_code),
        country: pick(row.object_country, row.client_country, 'LV'),
    };
}
async function persistObjectCoords(objectId, latitude, longitude) {
    await (0, pool_1.query)(`UPDATE client_objects SET latitude = ?, longitude = ?
     WHERE id = ? AND (latitude IS NULL OR longitude IS NULL)`, [latitude, longitude, objectId]);
}
async function saveMapMarkerCoords(objectId, latitude, longitude) {
    await (0, pool_1.query)('UPDATE client_objects SET latitude = ?, longitude = ? WHERE id = ?', [latitude, longitude, objectId]);
}
async function listMapMarkers() {
    const rows = await (0, pool_1.query)(`SELECT co.id AS object_id, co.client_id, c.name AS client_name, co.name AS object_name,
            co.address AS object_address, co.city AS object_city,
            co.postal_code AS object_postal_code, co.country AS object_country,
            c.address AS client_address, c.city AS client_city,
            c.postal_code AS client_postal_code, c.country AS client_country,
            co.latitude AS object_latitude, co.longitude AS object_longitude,
            c.latitude AS client_latitude, c.longitude AS client_longitude
     FROM client_objects co
     JOIN clients c ON c.id = co.client_id
     WHERE co.is_active = 1 AND co.status = 'active' AND c.is_active = 1
     ORDER BY co.name ASC`);
    if (rows.length === 0)
        return [];
    const placeholders = rows.map(() => '?').join(', ');
    const openIncidents = await (0, pool_1.query)(`SELECT i.object_id, i.id, i.incident_number, i.title, i.priority, i.status
     FROM incidents i
     WHERE i.object_id IN (${placeholders})
       AND i.status IN ('pending', 'in_progress', 'paused')
     ORDER BY
       FIELD(i.priority, 'critical', 'high', 'medium', 'low'),
       i.received_at DESC`, rows.map((r) => r.object_id));
    const incidentsByObject = new Map();
    for (const inc of openIncidents) {
        const list = incidentsByObject.get(inc.object_id) ?? [];
        list.push({
            id: inc.id,
            incident_number: inc.incident_number,
            title: inc.title,
            priority: inc.priority,
            status: inc.status,
        });
        incidentsByObject.set(inc.object_id, list);
    }
    const markers = [];
    for (const row of rows) {
        const locationParts = resolveLocationParts(row);
        const resolvedAddress = (0, geocode_1.formatResolvedAddress)(locationParts);
        let latitude = parseCoord(row.object_latitude) ?? parseCoord(row.client_latitude);
        let longitude = parseCoord(row.object_longitude) ?? parseCoord(row.client_longitude);
        let geocoded = false;
        if ((latitude == null || longitude == null) && resolvedAddress) {
            const coords = await (0, geocode_1.geocodeLocation)(locationParts);
            if (coords) {
                latitude = coords.lat;
                longitude = coords.lng;
                geocoded = true;
                await persistObjectCoords(row.object_id, latitude, longitude);
            }
        }
        if (latitude != null && longitude != null && geocoded && !locationParts.address?.trim()) {
            const jittered = (0, geocode_1.jitterCoords)(latitude, longitude, row.object_id);
            latitude = jittered.lat;
            longitude = jittered.lng;
        }
        const open = incidentsByObject.get(row.object_id) ?? [];
        markers.push({
            object_id: row.object_id,
            client_id: row.client_id,
            client_name: row.client_name,
            object_name: row.object_name,
            address: pick(row.object_address, row.client_address),
            city: pick(row.object_city, row.client_city),
            resolved_address: resolvedAddress,
            latitude,
            longitude,
            geocoded,
            open_incident_count: open.length,
            open_incidents: open,
        });
    }
    return markers;
}
//# sourceMappingURL=mapMarkers.js.map