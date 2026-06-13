import { queryOne } from '../db/pool';
import { logUnitActivity, type UnitActor } from './unitActivity';
import {
  listIncidentStatuses,
  statusByCode,
  type UnitStatusCode,
} from './incidentStatuses';
import { getUnitForObject, updateUnitForObject } from './units';

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
        const otherConfig = byCode.get(otherOpen.status);
        targetUnitStatus = otherConfig?.sync_unit_status ?? null;
        if (targetUnitStatus) {
          await applyUnitSync({
            unitId,
            clientId,
            objectId,
            incidentId,
            incidentStatus: otherOpen.status,
            targetUnitStatus,
            activityLabel: otherConfig?.sync_activity_label ?? null,
            actor,
          });
          return;
        }
      }
    }
    targetUnitStatus = triggered.sync_unit_status ?? null;
  } else {
    targetUnitStatus = triggered.sync_unit_status ?? null;
  }

  const activityLabel = triggered.sync_activity_label ?? null;
  if (!targetUnitStatus && !activityLabel?.trim()) return;

  await applyUnitSync({
    unitId,
    clientId,
    objectId,
    incidentId,
    incidentStatus,
    targetUnitStatus,
    activityLabel,
    actor,
  });
}

async function applyUnitSync(params: {
  unitId: string;
  clientId: string;
  objectId: string;
  incidentId: string;
  incidentStatus: string;
  targetUnitStatus: UnitStatusCode | null;
  activityLabel: string | null;
  actor?: UnitActor | null;
}): Promise<void> {
  const {
    unitId,
    clientId,
    objectId,
    incidentId,
    incidentStatus,
    targetUnitStatus,
    activityLabel,
    actor,
  } = params;

  const unit = await getUnitForObject(clientId, objectId, unitId);
  if (!unit) return;

  const note = activityLabel?.trim() || undefined;
  let statusChanged = false;

  if (targetUnitStatus && unit.status !== targetUnitStatus) {
    await updateUnitForObject(
      clientId,
      objectId,
      unitId,
      { status: targetUnitStatus },
      actor,
      { statusChangeNote: note, incidentId, incidentStatus }
    );
    statusChanged = true;
  }

  if (note && !statusChanged) {
    await logUnitActivity(unitId, 'incident_sync', note, actor, {
      incident_id: incidentId,
      incident_status: incidentStatus,
    });
  }
}
