import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { Unit } from '../models/types';
import type { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import type { z } from 'zod';
import { resolveAssetComponentId, resolveAssetTypeId } from './assetTypes';

type UnitInput = z.infer<typeof unitInputSchema>;
type UnitUpdate = z.infer<typeof unitUpdateSchema>;

const UNIT_SELECT = `
  u.*,
  at.name AS asset_type_name,
  at.code AS asset_type_code,
  ac.name AS asset_component_name
`;

const UNIT_JOINS = `
  LEFT JOIN asset_types at ON at.id = u.asset_type_id
  LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
`;

export type UnitRow = Unit & {
  asset_type_code?: string | null;
};

async function resolveUnitTypeFields(input: {
  asset_type_id?: string;
  unit_type?: string;
  asset_component_id?: string | null;
}): Promise<{ assetTypeId: string; unitTypeCode: string; assetComponentId: string | null }> {
  const assetType = await resolveAssetTypeId(input.asset_type_id, input.unit_type);
  const assetComponentId = await resolveAssetComponentId(
    input.asset_component_id,
    assetType.id
  );
  return {
    assetTypeId: assetType.id,
    unitTypeCode: assetType.code,
    assetComponentId,
  };
}

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
): Promise<UnitRow[]> {
  await assertObjectForClient(clientId, objectId);
  return query<UnitRow>(
    `SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.client_id = ? AND u.object_id = ?
     ORDER BY at.sort_order ASC, u.serial_number ASC`,
    [clientId, objectId]
  );
}

export async function getUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string
): Promise<UnitRow | null> {
  return queryOne<UnitRow>(
    `SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.id = ? AND u.client_id = ? AND u.object_id = ?`,
    [unitId, clientId, objectId]
  );
}

export async function createUnitForObject(
  clientId: string,
  objectId: string,
  input: UnitInput
): Promise<UnitRow> {
  await assertObjectForClient(clientId, objectId);

  const dup = await queryOne('SELECT id FROM units WHERE serial_number = ?', [
    input.serial_number,
  ]);
  if (dup) {
    throw new AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
  }

  const { assetTypeId, unitTypeCode, assetComponentId } = await resolveUnitTypeFields(input);

  const id = uuidv4();
  await query(
    `INSERT INTO units (
      id, client_id, object_id, unit_type, asset_type_id, asset_component_id,
      serial_number, model, manufacturer, status, location_note, installed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      objectId,
      unitTypeCode,
      assetTypeId,
      assetComponentId,
      input.serial_number.trim(),
      input.model ?? null,
      input.manufacturer ?? null,
      input.status,
      input.location_note ?? null,
      input.installed_at || null,
      input.notes ?? null,
    ]
  );

  const unit = await getUnitForObject(clientId, objectId, id);
  return unit!;
}

export async function updateUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string,
  input: UnitUpdate
): Promise<UnitRow | null> {
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

  const updates: Record<string, unknown> = { ...input };

  if (
    input.asset_type_id !== undefined ||
    input.unit_type !== undefined ||
    input.asset_component_id !== undefined
  ) {
    const resolved = await resolveUnitTypeFields({
      asset_type_id: input.asset_type_id ?? existing.asset_type_id ?? undefined,
      unit_type: input.unit_type ?? existing.unit_type,
      asset_component_id:
        input.asset_component_id !== undefined
          ? input.asset_component_id
          : existing.asset_component_id,
    });
    updates.unit_type = resolved.unitTypeCode;
    updates.asset_type_id = resolved.assetTypeId;
    updates.asset_component_id = resolved.assetComponentId;
  }

  const fields = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (fields.length === 0) return existing;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => {
    const v = updates[f];
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
): Promise<UnitRow[]> {
  const object = await queryOne<{ id: string; client_id: string; status: string }>(
    `SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND is_active = 1 AND status = 'active'`,
    [objectId]
  );
  if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');

  const canAccess =
    clientWideIds.includes(object.client_id) || objectScopedIds.includes(objectId);
  if (!canAccess) throw new AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');

  return query<UnitRow>(
    `SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.object_id = ? AND u.status IN ('active', 'repair')
     ORDER BY at.sort_order ASC, u.serial_number ASC`,
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

export function unitLabel(
  unit: Pick<UnitRow, 'unit_type' | 'serial_number' | 'model' | 'asset_type_name' | 'asset_component_name'>
): string {
  const type = unit.asset_type_name || unit.unit_type;
  const component = unit.asset_component_name ? ` · ${unit.asset_component_name}` : '';
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model}${component} · ${unit.serial_number}`;
}
