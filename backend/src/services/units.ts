import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { Unit } from '../models/types';
import type { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import type { z } from 'zod';
import { resolveAssetComponentId, resolveAssetTypeId } from './assetTypes';
import { logUnitActivity, type UnitActor } from './unitActivity';

type UnitInput = z.infer<typeof unitInputSchema>;
type UnitUpdate = z.infer<typeof unitUpdateSchema>;

const UNIT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktīva',
  repair: 'Remontā',
  decommissioned: 'Izņemta',
  spare: 'Rezerve',
};

const UNIT_SELECT = `
  u.*,
  at.name AS asset_type_name,
  at.code AS asset_type_code,
  ac.name AS asset_component_name,
  pu.serial_number AS parent_serial_number,
  pac.name AS parent_component_name
`;

const UNIT_JOINS = `
  LEFT JOIN asset_types at ON at.id = u.asset_type_id
  LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
  LEFT JOIN units pu ON pu.id = u.parent_unit_id
  LEFT JOIN asset_type_components pac ON pac.id = pu.asset_component_id
`;

const OPEN_INCIDENT_COUNT_SQL = `
  (SELECT COUNT(*) FROM incidents i
   INNER JOIN incident_statuses st ON st.code = i.status AND st.category = 'open' AND st.is_active = 1
   WHERE i.unit_id = u.id) AS open_incident_count
`;

export type UnitRow = Unit & {
  asset_type_code?: string | null;
  parent_serial_number?: string | null;
  parent_component_name?: string | null;
  open_incident_count?: number;
};

type ResolvedUnitFields = {
  assetTypeId: string;
  unitTypeCode: string;
  assetComponentId: string | null;
  parentUnitId: string | null;
};

async function getMainUnitForObject(
  clientId: string,
  objectId: string,
  parentUnitId: string
): Promise<UnitRow> {
  const parent = await queryOne<UnitRow>(
    `SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.id = ? AND u.client_id = ? AND u.object_id = ? AND u.parent_unit_id IS NULL`,
    [parentUnitId, clientId, objectId]
  );
  if (!parent) {
    throw new AppError(400, 'Galvenais aktīvs nav atrasts', 'INVALID_PARENT');
  }
  return parent;
}

async function resolveUnitFields(
  clientId: string,
  objectId: string,
  input: {
    asset_type_id?: string;
    unit_type?: string;
    asset_component_id?: string | null;
    parent_unit_id?: string | null;
  },
  existing?: UnitRow | null
): Promise<ResolvedUnitFields> {
  const parentUnitId = input.parent_unit_id !== undefined
    ? input.parent_unit_id
    : existing?.parent_unit_id ?? null;

  if (parentUnitId) {
    const parent = await getMainUnitForObject(clientId, objectId, parentUnitId);
    if (!input.asset_component_id && !existing?.asset_component_id) {
      throw new AppError(400, 'Apakšaktīvam jānorāda apakšsadaļa', 'INVALID_COMPONENT');
    }
    const componentId = await resolveAssetComponentId(
      input.asset_component_id !== undefined
        ? input.asset_component_id
        : existing?.asset_component_id,
      parent.asset_type_id!
    );
    return {
      assetTypeId: parent.asset_type_id!,
      unitTypeCode: parent.unit_type as string,
      assetComponentId: componentId,
      parentUnitId,
    };
  }

  const assetType = await resolveAssetTypeId(
    input.asset_type_id ?? existing?.asset_type_id ?? undefined,
    input.unit_type ?? existing?.unit_type
  );
  const componentId = await resolveAssetComponentId(
    input.asset_component_id !== undefined
      ? input.asset_component_id
      : existing?.asset_component_id,
    assetType.id
  );

  return {
    assetTypeId: assetType.id,
    unitTypeCode: assetType.code,
    assetComponentId: componentId,
    parentUnitId: null,
  };
}

function unitSummary(unit: Pick<UnitRow, 'serial_number' | 'asset_type_name' | 'asset_component_name'>): string {
  const type = unit.asset_type_name || 'Aktīvs';
  const component = unit.asset_component_name ? ` (${unit.asset_component_name})` : '';
  return `${type}${component} · ${unit.serial_number}`;
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
    `SELECT ${UNIT_SELECT}, ${OPEN_INCIDENT_COUNT_SQL}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.client_id = ? AND u.object_id = ?
     ORDER BY
       CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
       COALESCE(pu.serial_number, u.serial_number) ASC,
       u.serial_number ASC`,
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
  input: UnitInput,
  actor?: UnitActor | null
): Promise<UnitRow> {
  await assertObjectForClient(clientId, objectId);

  const dup = await queryOne('SELECT id FROM units WHERE serial_number = ?', [
    input.serial_number,
  ]);
  if (dup) {
    throw new AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
  }

  const resolved = await resolveUnitFields(clientId, objectId, input);

  const id = uuidv4();
  await query(
    `INSERT INTO units (
      id, client_id, object_id, parent_unit_id, unit_type, asset_type_id, asset_component_id,
      serial_number, model, manufacturer, status, location_note, installed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      objectId,
      resolved.parentUnitId,
      resolved.unitTypeCode,
      resolved.assetTypeId,
      resolved.assetComponentId,
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

  if (resolved.parentUnitId && unit) {
    const parent = await getUnitForObject(clientId, objectId, resolved.parentUnitId);
    await logUnitActivity(
      id,
      'linked_to_parent',
      `Pievienots pie galvenā aktīva: ${unitSummary(parent!)}`,
      actor
    );
  }

  await logUnitActivity(
    id,
    'created',
    resolved.parentUnitId ? 'Izveidots apakšaktīvs' : 'Izveidots galvenais aktīvs',
    actor,
    { serial_number: input.serial_number.trim() }
  );

  return unit!;
}

export async function updateUnitForObject(
  clientId: string,
  objectId: string,
  unitId: string,
  input: UnitUpdate,
  actor?: UnitActor | null,
  options?: { statusChangeNote?: string }
): Promise<UnitRow | null> {
  const existing = await getUnitForObject(clientId, objectId, unitId);
  if (!existing) return null;

  if (existing.parent_unit_id === null) {
    const childCount = await queryOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?',
      [unitId]
    );
    if ((childCount?.total ?? 0) > 0 && input.parent_unit_id) {
      throw new AppError(400, 'Galvenajam aktīvam ar apakšaktīviem nevar mainīt tipu uz apakšaktīvu', 'HAS_CHILDREN');
    }
  }

  const childUnits = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?',
    [unitId]
  );
  if ((childUnits?.total ?? 0) > 0 && input.parent_unit_id) {
    throw new AppError(400, 'Aktīvam ar apakšaktīviem nevar piešķirt jaunu galveno aktīvu', 'HAS_CHILDREN');
  }

  if (input.serial_number && input.serial_number !== existing.serial_number) {
    const dup = await queryOne('SELECT id FROM units WHERE serial_number = ? AND id != ?', [
      input.serial_number,
      unitId,
    ]);
    if (dup) {
      throw new AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
    }
  }

  const resolved = await resolveUnitFields(
    clientId,
    objectId,
    {
      asset_type_id: input.asset_type_id,
      unit_type: input.unit_type,
      asset_component_id: input.asset_component_id,
      parent_unit_id: input.parent_unit_id,
    },
    existing
  );

  const updates: Record<string, unknown> = {
    ...input,
    unit_type: resolved.unitTypeCode,
    asset_type_id: resolved.assetTypeId,
    asset_component_id: resolved.assetComponentId,
    parent_unit_id: resolved.parentUnitId,
  };

  const fields = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (fields.length === 0) return existing;

  if (
    input.parent_unit_id !== undefined &&
    input.parent_unit_id !== existing.parent_unit_id
  ) {
    if (input.parent_unit_id && !existing.parent_unit_id) {
      const parent = await getUnitForObject(clientId, objectId, input.parent_unit_id);
      await logUnitActivity(
        unitId,
        'linked_to_parent',
        `Pievienots pie galvenā aktīva: ${unitSummary(parent!)}`,
        actor
      );
    } else if (!input.parent_unit_id && existing.parent_unit_id) {
      await logUnitActivity(unitId, 'unlinked_from_parent', 'Atvienots no galvenā aktīva', actor);
    } else if (input.parent_unit_id && existing.parent_unit_id) {
      const oldParent = await getUnitForObject(clientId, objectId, existing.parent_unit_id);
      const newParent = await getUnitForObject(clientId, objectId, input.parent_unit_id);
      await logUnitActivity(
        unitId,
        'moved_to_parent',
        `Pārvietots no „${unitSummary(oldParent!)}” uz „${unitSummary(newParent!)}”`,
        actor
      );
    }
  }

  if (input.status !== undefined && input.status !== existing.status) {
    const note = options?.statusChangeNote?.trim();
    await logUnitActivity(
      unitId,
      note ? 'incident_sync' : 'status_changed',
      note ||
        `Statuss: ${UNIT_STATUS_LABELS[existing.status] || existing.status} → ${UNIT_STATUS_LABELS[input.status] || input.status}`,
      actor,
      note ? { source: 'incident' } : undefined
    );
  }

  const otherFields = fields.filter(
    (f) =>
      !['parent_unit_id', 'status', 'asset_type_id', 'unit_type', 'asset_component_id'].includes(f) &&
      (updates[f] ?? null) !== ((existing as unknown as Record<string, unknown>)[f] ?? null)
  );
  if (otherFields.length > 0) {
    await logUnitActivity(unitId, 'updated', 'Laboti aktīva dati', actor, {
      fields: otherFields,
    });
  }

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
  unitId: string,
  actor?: UnitActor | null
): Promise<void> {
  const existing = await getUnitForObject(clientId, objectId, unitId);
  if (!existing) throw new AppError(404, 'Unit not found', 'NOT_FOUND');

  const children = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?',
    [unitId]
  );
  if ((children?.total ?? 0) > 0) {
    throw new AppError(
      409,
      'Nevar dzēst galveno aktīvu — vispirms noņemiet vai pārvietojiet apakšaktīvus.',
      'HAS_CHILDREN'
    );
  }

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

  await logUnitActivity(
    unitId,
    'deleted',
    existing.parent_unit_id ? 'Apakšaktīvs dzēsts' : 'Galvenais aktīvs dzēsts',
    actor
  );

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
     ORDER BY
       CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
       COALESCE(pu.serial_number, u.serial_number) ASC,
       u.serial_number ASC`,
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
  unit: Pick<UnitRow, 'unit_type' | 'serial_number' | 'model' | 'asset_type_name' | 'asset_component_name' | 'parent_unit_id'>
): string {
  if (unit.parent_unit_id && unit.asset_component_name) {
    const model = unit.model ? ` ${unit.model}` : '';
    return `${unit.asset_component_name}${model} · ${unit.serial_number}`;
  }
  const type = unit.asset_type_name || unit.unit_type;
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model} · ${unit.serial_number}`;
}
