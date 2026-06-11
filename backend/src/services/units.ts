import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { Unit } from '../models/types';
import type { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import type { z } from 'zod';

type UnitInput = z.infer<typeof unitInputSchema>;
type UnitUpdate = z.infer<typeof unitUpdateSchema>;

export async function assertObjectForClient(
  clientId: string,
  objectId: string
): Promise<void> {
  const row = await queryOne(
    `SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`,
    [objectId, clientId]
  );
  if (!row) throw new AppError(404, 'Object not found', 'NOT_FOUND');
}

export async function listUnitsForObject(
  clientId: string,
  objectId: string
): Promise<Unit[]> {
  await assertObjectForClient(clientId, objectId);
  return query<Unit>(
    `SELECT * FROM units
     WHERE client_id = ? AND object_id = ?
     ORDER BY unit_type ASC, serial_number ASC`,
    [clientId, objectId]
  );
}

export async function getUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string
): Promise<Unit | null> {
  return queryOne<Unit>(
    `SELECT * FROM units WHERE id = ? AND client_id = ? AND object_id = ?`,
    [unitId, clientId, objectId]
  );
}

export async function createUnitForObject(
  clientId: string,
  objectId: string,
  input: UnitInput
): Promise<Unit> {
  await assertObjectForClient(clientId, objectId);

  const dup = await queryOne('SELECT id FROM units WHERE serial_number = ?', [
    input.serial_number,
  ]);
  if (dup) {
    throw new AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
  }

  const id = uuidv4();
  await query(
    `INSERT INTO units (
      id, client_id, object_id, unit_type, serial_number, model, manufacturer,
      status, location_note, installed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      objectId,
      input.unit_type,
      input.serial_number.trim(),
      input.model ?? null,
      input.manufacturer ?? null,
      input.status,
      input.location_note ?? null,
      input.installed_at || null,
      input.notes ?? null,
    ]
  );

  const unit = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [id]);
  return unit!;
}

export async function updateUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string,
  input: UnitUpdate
): Promise<Unit | null> {
  const existing = await getUnitForObject(clientId, objectId, unitId);
  if (!existing) return null;

  if (input.serial_number && input.serial_number !== existing.serial_number) {
    const dup = await queryOne('SELECT id FROM units WHERE serial_number = ? AND id != ?', [
      input.serial_number,
      unitId,
    ]);
    if (dup) {
      throw new AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
    }
  }

  const fields = Object.keys(input);
  if (fields.length === 0) return existing;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => {
    const v = (input as Record<string, unknown>)[f];
    if (f === 'serial_number' && typeof v === 'string') return v.trim();
    return v ?? null;
  });

  await query(`UPDATE units SET ${setClause} WHERE id = ?`, [...values, unitId]);
  return getUnitForObject(clientId, objectId, unitId);
}

export async function deleteUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string
): Promise<void> {
  const existing = await getUnitForObject(clientId, objectId, unitId);
  if (!existing) throw new AppError(404, 'Unit not found', 'NOT_FOUND');

  const incidents = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM incidents WHERE unit_id = ?',
    [unitId]
  );
  if ((incidents?.total ?? 0) > 0) {
    throw new AppError(
      409,
      'Vienību nevar dzēst — ir saistīti izsaukumi. Mainiet statusu uz „Izņemta”.',
      'HAS_INCIDENTS'
    );
  }

  await query('DELETE FROM units WHERE id = ?', [unitId]);
}

export async function listPortalUnitsForObject(
  objectId: string,
  clientWideIds: string[],
  objectScopedIds: string[]
): Promise<Unit[]> {
  const object = await queryOne<{ id: string; client_id: string; status: string }>(
    `SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND is_active = 1 AND status = 'active'`,
    [objectId]
  );
  if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');

  const canAccess =
    clientWideIds.includes(object.client_id) || objectScopedIds.includes(objectId);
  if (!canAccess) throw new AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');

  return query<Unit>(
    `SELECT * FROM units
     WHERE object_id = ? AND status IN ('active', 'repair')
     ORDER BY unit_type ASC, serial_number ASC`,
    [objectId]
  );
}

export async function assertUnitForIncident(
  unitId: string,
  clientId: string,
  objectId: string
): Promise<void> {
  const unit = await queryOne<{ id: string }>(
    `SELECT id FROM units
     WHERE id = ? AND client_id = ? AND object_id = ?
       AND status IN ('active', 'repair')`,
    [unitId, clientId, objectId]
  );
  if (!unit) {
    throw new AppError(400, 'Ierīce nav pieejama šim objektam', 'INVALID_UNIT');
  }
}

export function unitLabel(unit: Pick<Unit, 'unit_type' | 'serial_number' | 'model'>): string {
  const typeLabels: Record<string, string> = {
    computer: 'Dators',
    pos: 'POS',
    printer: 'Printeris',
    network: 'Tīkls',
    other: 'Cits',
  };
  const type = typeLabels[unit.unit_type] || unit.unit_type;
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model} · ${unit.serial_number}`;
}
