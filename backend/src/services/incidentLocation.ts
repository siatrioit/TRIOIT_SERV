import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { assertUnitForIncident } from './units';

type IncidentLocationInput = {
  client_id: string;
  object_id?: string;
  unit_id?: string;
};

async function listActiveObjectIds(clientId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM client_objects
     WHERE client_id = ? AND is_active = 1 AND status = 'active'
     ORDER BY name ASC`,
    [clientId]
  );
  return rows.map((r) => r.id);
}

async function resolveObjectForClient(
  clientId: string,
  objectId: string | null
): Promise<string | null> {
  if (objectId) return objectId;

  const activeIds = await listActiveObjectIds(clientId);
  if (activeIds.length === 1) return activeIds[0];
  if (activeIds.length > 1) {
    throw new AppError(400, 'Izvēlieties objektu', 'OBJECT_REQUIRED');
  }
  return null;
}

export async function resolveIncidentLocation(
  input: IncidentLocationInput
): Promise<{ client_id: string; object_id: string | null; unit_id: string | null }> {
  let objectId = input.object_id ?? null;
  const unitId = input.unit_id ?? null;

  if (unitId) {
    const unit = await queryOne<{ client_id: string; object_id: string | null }>(
      'SELECT client_id, object_id FROM units WHERE id = ?',
      [unitId]
    );
    if (!unit) throw new AppError(400, 'Ierīce nav atrasta', 'INVALID_UNIT');
    if (unit.client_id !== input.client_id) {
      throw new AppError(400, 'Ierīce nepieder šim klientam', 'INVALID_UNIT');
    }
    if (objectId && unit.object_id && unit.object_id !== objectId) {
      throw new AppError(400, 'Ierīce nepieder šim objektam', 'INVALID_UNIT');
    }
    objectId = unit.object_id ?? objectId;
    if (objectId) {
      await assertUnitForIncident(unitId, input.client_id, objectId);
    }
  }

  objectId = await resolveObjectForClient(input.client_id, objectId);

  if (objectId) {
    const object = await queryOne(
      `SELECT id FROM client_objects
       WHERE id = ? AND client_id = ? AND is_active = 1 AND status = 'active'`,
      [objectId, input.client_id]
    );
    if (!object) throw new AppError(400, 'Objekts nav pieejams', 'INVALID_OBJECT');
  }

  return { client_id: input.client_id, object_id: objectId, unit_id: unitId };
}

export const incidentLocationSchema = z.object({
  client_id: z.string().uuid(),
  object_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
});
