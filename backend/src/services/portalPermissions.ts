import { queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { PortalAccessGrant } from './portalScope';

export type PortalRole = 'viewer' | 'operator' | 'manager';

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  viewer: 'Skatītājs',
  operator: 'Operators',
  manager: 'Vadītājs',
};

export function normalizePortalRole(role: string | undefined | null): PortalRole {
  const value = String(role ?? 'operator').trim().toLowerCase();
  if (value === 'viewer' || value === 'manager') return value;
  return 'operator';
}

export function isPortalWriterRole(role: PortalRole): boolean {
  return role === 'operator' || role === 'manager';
}

function matchingGrants(
  grants: PortalAccessGrant[],
  clientId: string,
  objectId?: string | null
): PortalAccessGrant[] {
  return grants.filter((g) => {
    if (normalizeScope(g.scope) === 'client' && g.client_id === clientId) return true;
    if (objectId && normalizeScope(g.scope) === 'object' && g.object_id === objectId) return true;
    return false;
  });
}

function normalizeScope(scope: string): 'client' | 'object' {
  return String(scope).trim().toLowerCase() === 'client' ? 'client' : 'object';
}

export function portalCanCreateIncident(
  grants: PortalAccessGrant[],
  clientId: string,
  objectId: string
): boolean {
  return matchingGrants(grants, clientId, objectId).some((g) =>
    isPortalWriterRole(normalizePortalRole(g.portal_role))
  );
}

export function portalCanSendChat(
  grants: PortalAccessGrant[],
  clientId: string,
  objectId?: string | null
): boolean {
  return matchingGrants(grants, clientId, objectId).some((g) =>
    isPortalWriterRole(normalizePortalRole(g.portal_role))
  );
}

export function assertPortalCanCreateIncident(
  grants: PortalAccessGrant[],
  clientId: string,
  objectId: string
): void {
  if (!portalCanCreateIncident(grants, clientId, objectId)) {
    throw new AppError(403, 'Nav tiesību reģistrēt izsaukumu', 'FORBIDDEN');
  }
}

export async function assertPortalCanSendChat(
  grants: PortalAccessGrant[],
  incidentId: string
): Promise<void> {
  const incident = await queryOne<{ client_id: string; object_id: string | null }>(
    'SELECT client_id, object_id FROM incidents WHERE id = ?',
    [incidentId]
  );
  if (!incident) {
    throw new AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
  }
  if (!portalCanSendChat(grants, incident.client_id, incident.object_id)) {
    throw new AppError(403, 'Nav tiesību rakstīt čatā', 'FORBIDDEN');
  }
}

export function portalUserCanWrite(grants: PortalAccessGrant[]): boolean {
  return grants.some((g) => isPortalWriterRole(normalizePortalRole(g.portal_role)));
}
