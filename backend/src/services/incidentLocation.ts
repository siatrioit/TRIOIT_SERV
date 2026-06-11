import { z } from 'zod';
import { queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { assertUnitForIncident } from './units';

type IncidentLocationInput = {
  client_id: string;
  object_id?: string;
  unit_id?: string;
};

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
