import { queryOne } from '../db/pool';
import {
  listIncidentStatuses,
  statusByCode,
  type UnitStatusCode,
} from './incidentStatuses';
import { getUnitForObject, updateUnitForObject } from './units';
import type { UnitActor } from './unitActivity';

/**
 * Atjauno aktīva statusu pēc atgadījuma statusa konfigurācijas.
 * Noslēdzot atgadījumu, ja aktīvam ir citi atvērtie — ņem vērā jaunāko atvērto.
 */
export async function syncUnitStatusFromIncident(
  params: {
    unitId: string;
    clientId: string;
    objectId: string;
    incidentId: string;
    incidentStatus: string;
  },
  actor?: UnitActor | null
): Promise<void> {
  const { unitId, clientId, objectId, incidentId, incidentStatus } = params;
  const statuses = await listIncidentStatuses(true);
  const byCode = statusByCode(statuses);
  const triggered = byCode.get(incidentStatus);
  if (!triggered) return;

  let targetUnitStatus: UnitStatusCode | null = null;

  if (triggered.category === 'closed') {
    const openCodes = statuses.filter((s) => s.category === 'open').map((s) => s.code);
    if (openCodes.length > 0) {
      const placeholders = openCodes.map(() => '?').join(', ');
      const otherOpen = await queryOne<{ status: string }>(
        `SELECT status FROM incidents
         WHERE unit_id = ? AND id != ? AND status IN (${placeholders})
         ORDER BY received_at DESC LIMIT 1`,
        [unitId, incidentId, ...openCodes]
      );
      if (otherOpen) {
        targetUnitStatus = byCode.get(otherOpen.status)?.sync_unit_status ?? null;
      }
    }
    if (!targetUnitStatus) {
      targetUnitStatus = triggered.sync_unit_status ?? null;
    }
  } else {
    targetUnitStatus = triggered.sync_unit_status ?? null;
  }

  if (!targetUnitStatus) return;

  const unit = await getUnitForObject(clientId, objectId, unitId);
  if (!unit || unit.status === targetUnitStatus) return;

  await updateUnitForObject(clientId, objectId, unitId, { status: targetUnitStatus }, actor);
}
