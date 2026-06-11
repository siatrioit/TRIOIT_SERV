"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPEN_STATUSES = void 0;
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
async function listMapMarkers() {
    const rows = await (0, pool_1.query)(`SELECT co.id AS object_id, co.client_id, c.name AS client_name, co.name AS object_name,
            co.address, co.city, co.postal_code, co.country,
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
        let latitude = parseCoord(row.object_latitude) ?? parseCoord(row.client_latitude);
        let longitude = parseCoord(row.object_longitude) ?? parseCoord(row.client_longitude);
        let geocoded = false;
        if (latitude == null || longitude == null) {
            const geocodeQuery = (0, geocode_1.buildGeocodeQuery)({
                name: row.object_name,
                address: row.address,
                city: row.city,
                postal_code: row.postal_code,
                country: row.country,
            });
            if (geocodeQuery) {
                const coords = await (0, geocode_1.geocodeAddress)(geocodeQuery);
                if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                    geocoded = true;
                }
            }
        }
        const open = incidentsByObject.get(row.object_id) ?? [];
        markers.push({
            object_id: row.object_id,
            client_id: row.client_id,
            client_name: row.client_name,
            object_name: row.object_name,
            address: row.address,
            city: row.city,
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