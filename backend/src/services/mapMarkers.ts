import { query } from '../db/pool';
import { buildGeocodeQuery, geocodeAddress } from './geocode';

export type MapOpenIncident = {
  id: string;
  incident_number: string;
  title: string;
  priority: string;
  status: string;
};

export type MapMarker = {
  object_id: string;
  client_id: string;
  client_name: string;
  object_name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded: boolean;
  open_incident_count: number;
  open_incidents: MapOpenIncident[];
};

type MapObjectRow = {
  object_id: string;
  client_id: string;
  client_name: string;
  object_name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  object_latitude: number | string | null;
  object_longitude: number | string | null;
  client_latitude: number | string | null;
  client_longitude: number | string | null;
};

const OPEN_STATUSES = ['pending', 'in_progress', 'paused'] as const;

function parseCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function listMapMarkers(): Promise<MapMarker[]> {
  const rows = await query<MapObjectRow>(
    `SELECT co.id AS object_id, co.client_id, c.name AS client_name, co.name AS object_name,
            co.address, co.city, co.postal_code, co.country,
            co.latitude AS object_latitude, co.longitude AS object_longitude,
            c.latitude AS client_latitude, c.longitude AS client_longitude
     FROM client_objects co
     JOIN clients c ON c.id = co.client_id
     WHERE co.is_active = 1 AND co.status = 'active' AND c.is_active = 1
     ORDER BY co.name ASC`
  );

  if (rows.length === 0) return [];

  const placeholders = rows.map(() => '?').join(', ');
  const openIncidents = await query<MapOpenIncident & { object_id: string }>(
    `SELECT i.object_id, i.id, i.incident_number, i.title, i.priority, i.status
     FROM incidents i
     WHERE i.object_id IN (${placeholders})
       AND i.status IN ('pending', 'in_progress', 'paused')
     ORDER BY
       FIELD(i.priority, 'critical', 'high', 'medium', 'low'),
       i.received_at DESC`,
    rows.map((r) => r.object_id)
  );

  const incidentsByObject = new Map<string, MapOpenIncident[]>();
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

  const markers: MapMarker[] = [];

  for (const row of rows) {
    let latitude =
      parseCoord(row.object_latitude) ?? parseCoord(row.client_latitude);
    let longitude =
      parseCoord(row.object_longitude) ?? parseCoord(row.client_longitude);
    let geocoded = false;

    if (latitude == null || longitude == null) {
      const geocodeQuery = buildGeocodeQuery({
        name: row.object_name,
        address: row.address,
        city: row.city,
        postal_code: row.postal_code,
        country: row.country,
      });
      if (geocodeQuery) {
        const coords = await geocodeAddress(geocodeQuery);
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

export { OPEN_STATUSES };
