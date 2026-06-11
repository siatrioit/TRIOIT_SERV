import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

export type PortalAccessGrant = {
  id: string;
  client_id: string;
  object_id: string | null;
  scope: 'client' | 'object';
  client_name: string;
  object_name?: string | null;
};

export type PortalObject = {
  id: string;
  client_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  object_code?: string | null;
  status: string;
};

function normalizeScope(scope: string): 'client' | 'object' {
  const value = String(scope).trim().toLowerCase();
  return value === 'client' ? 'client' : 'object';
}

function grantObjectIds(grants: PortalAccessGrant[]): string[] {
  return [
    ...new Set(
      grants
        .filter((g) => normalizeScope(g.scope) === 'object' && g.object_id)
        .map((g) => String(g.object_id).trim())
        .filter(Boolean)
    ),
  ];
}

export async function getPortalUserAccess(portalUserId: string): Promise<PortalAccessGrant[]> {
  return query<PortalAccessGrant>(
    `SELECT pa.id, pa.client_id, pa.object_id, pa.scope,
            c.name AS client_name, co.name AS object_name
     FROM portal_access pa
     JOIN clients c ON c.id = pa.client_id AND c.is_active = 1
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.portal_user_id = ? AND pa.is_active = 1
       AND EXISTS (SELECT 1 FROM portal_users pu WHERE pu.id = ? AND pu.is_active = 1)`,
    [portalUserId, portalUserId]
  );
}

/** SQL nosacījums — kuri atgadījumi redzami portāla lietotājam */
export async function buildIncidentScopeClause(
  grants: PortalAccessGrant[]
): Promise<{ clause: string; params: unknown[] }> {
  if (grants.length === 0) {
    return { clause: '1 = 0', params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];

  const clientScopeIds = [
    ...new Set(
      grants
        .filter((g) => normalizeScope(g.scope) === 'client')
        .map((g) => g.client_id)
    ),
  ];

  for (const clientId of clientScopeIds) {
    parts.push('i.client_id = ?');
    params.push(clientId);
  }

  const objectScopeIds = grantObjectIds(grants);

  if (clientScopeIds.length === 0) {
    if (objectScopeIds.length === 1) {
      parts.push('i.object_id = ?');
      params.push(objectScopeIds[0]);
    } else if (objectScopeIds.length > 1) {
      parts.push(`i.object_id IN (${objectScopeIds.map(() => '?').join(', ')})`);
      params.push(...objectScopeIds);
    }

    const objectOnlyClientIds = [
      ...new Set(
        grants
          .filter((g) => normalizeScope(g.scope) === 'object')
          .map((g) => g.client_id)
      ),
    ];

    for (const clientId of objectOnlyClientIds) {
      parts.push('(i.client_id = ? AND i.object_id IS NULL)');
      params.push(clientId);
    }
  }

  return { clause: parts.length ? `(${parts.join(' OR ')})` : '1 = 0', params };
}

export async function assertCanViewIncident(
  grants: PortalAccessGrant[],
  incidentId: string
): Promise<void> {
  const { clause, params } = await buildIncidentScopeClause(grants);
  const row = await queryOne(
    `SELECT i.id FROM incidents i WHERE i.id = ? AND ${clause}`,
    [incidentId, ...params]
  );
  if (!row) {
    throw new AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
  }
}

export async function assertCanCreateIncident(
  grants: PortalAccessGrant[],
  clientId: string,
  objectId: string
): Promise<void> {
  const object = await queryOne<{ id: string; client_id: string; status: string }>(
    `SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`,
    [objectId, clientId]
  );
  if (!object || object.status !== 'active') {
    throw new AppError(400, 'Objekts nav pieejams', 'INVALID_OBJECT');
  }

  const normalizedObjectId = objectId.trim();

  const allowed = grants.some((g) => {
    if (normalizeScope(g.scope) === 'client' && g.client_id === clientId) return true;
    if (
      normalizeScope(g.scope) === 'object' &&
      g.object_id &&
      String(g.object_id).trim() === normalizedObjectId
    ) {
      return true;
    }
    return false;
  });

  if (!allowed) {
    throw new AppError(403, 'Nav tiesību reģistrēt izsaukumu šim objektam', 'FORBIDDEN');
  }
}

export async function assertCanAccessObject(
  grants: PortalAccessGrant[],
  objectId: string
): Promise<void> {
  const objects = await listAccessibleObjects(grants);
  const normalized = objectId.trim();
  if (!objects.some((o) => o.id.trim() === normalized)) {
    throw new AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');
  }
}

export async function listAccessibleObjects(grants: PortalAccessGrant[]): Promise<PortalObject[]> {
  if (grants.length === 0) return [];

  const clientIds = [
    ...new Set(
      grants
        .filter((g) => normalizeScope(g.scope) === 'client')
        .map((g) => g.client_id)
    ),
  ];
  const objectIds = grantObjectIds(grants);

  const results: PortalObject[] = [];

  if (clientIds.length > 0) {
    const placeholders = clientIds.map(() => '?').join(', ');
    const rows = await query<PortalObject>(
      `SELECT id, client_id, name, address, city, object_code, status
       FROM client_objects
       WHERE client_id IN (${placeholders}) AND is_active = 1 AND status = 'active'
       ORDER BY name ASC`,
      clientIds
    );
    results.push(...rows);
  }

  if (objectIds.length > 0) {
    const placeholders = objectIds.map(() => '?').join(', ');
    const rows = await query<PortalObject>(
      `SELECT id, client_id, name, address, city, object_code, status
       FROM client_objects
       WHERE id IN (${placeholders}) AND is_active = 1 AND status = 'active'
       ORDER BY name ASC`,
      objectIds
    );
    for (const row of rows) {
      if (!results.some((r) => r.id === row.id)) {
        results.push(row);
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}
