import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

export interface AssetTypeRow {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetTypeComponentRow {
  id: string;
  asset_type_id: string;
  name: string;
  sort_order: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

function slugifyCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'type';
}

export async function listActiveAssetTypes(withComponents: boolean): Promise<
  (AssetTypeRow & { components?: AssetTypeComponentRow[] })[]
> {
  const types = await query<AssetTypeRow>(
    `SELECT * FROM asset_types
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC`
  );

  if (!withComponents) return types;

  const components = await query<AssetTypeComponentRow>(
    `SELECT * FROM asset_type_components
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC`
  );

  const byType = new Map<string, AssetTypeComponentRow[]>();
  for (const c of components) {
    const list = byType.get(c.asset_type_id) ?? [];
    list.push(c);
    byType.set(c.asset_type_id, list);
  }

  return types.map((t) => ({
    ...t,
    components: byType.get(t.id) ?? [],
  }));
}

export async function listAllAssetTypesAdmin(): Promise<
  (AssetTypeRow & { components: AssetTypeComponentRow[] })[]
> {
  const types = await query<AssetTypeRow>(
    `SELECT * FROM asset_types ORDER BY sort_order ASC, name ASC`
  );
  const components = await query<AssetTypeComponentRow>(
    `SELECT * FROM asset_type_components ORDER BY sort_order ASC, name ASC`
  );
  const byType = new Map<string, AssetTypeComponentRow[]>();
  for (const c of components) {
    const list = byType.get(c.asset_type_id) ?? [];
    list.push(c);
    byType.set(c.asset_type_id, list);
  }
  return types.map((t) => ({ ...t, components: byType.get(t.id) ?? [] }));
}

export async function getAssetTypeById(id: string): Promise<AssetTypeRow | null> {
  return queryOne<AssetTypeRow>('SELECT * FROM asset_types WHERE id = ?', [id]);
}

export async function resolveAssetTypeId(
  assetTypeId: string | undefined,
  unitTypeCode: string | undefined
): Promise<{ id: string; code: string; name: string }> {
  if (assetTypeId) {
    const row = await queryOne<{ id: string; code: string; name: string; is_active: number }>(
      'SELECT id, code, name, is_active FROM asset_types WHERE id = ?',
      [assetTypeId]
    );
    if (!row || !row.is_active) {
      throw new AppError(400, 'Aktīva tips nav atrasts', 'INVALID_ASSET_TYPE');
    }
    return row;
  }

  if (unitTypeCode) {
    const row = await queryOne<{ id: string; code: string; name: string; is_active: number }>(
      'SELECT id, code, name, is_active FROM asset_types WHERE code = ?',
      [unitTypeCode]
    );
    if (!row || !row.is_active) {
      throw new AppError(400, 'Aktīva tips nav atrasts', 'INVALID_ASSET_TYPE');
    }
    return row;
  }

  throw new AppError(400, 'Norādiet aktīva tipu', 'INVALID_ASSET_TYPE');
}

export async function resolveAssetComponentId(
  componentId: string | null | undefined,
  assetTypeId: string
): Promise<string | null> {
  if (!componentId) return null;

  const row = await queryOne<{ id: string; asset_type_id: string; is_active: number }>(
    'SELECT id, asset_type_id, is_active FROM asset_type_components WHERE id = ?',
    [componentId]
  );
  if (!row || !row.is_active || row.asset_type_id !== assetTypeId) {
    throw new AppError(400, 'Apakšsadaļa nav derīga šim tipam', 'INVALID_ASSET_COMPONENT');
  }
  return row.id;
}

export async function createAssetType(input: {
  name: string;
  code?: string;
  sort_order?: number;
}): Promise<AssetTypeRow> {
  let code = input.code?.trim() || slugifyCode(input.name);
  const existingCode = await queryOne('SELECT id FROM asset_types WHERE code = ?', [code]);
  if (existingCode) {
    code = `${code}_${Date.now().toString(36).slice(-4)}`;
  }

  const id = uuidv4();
  const sortOrder = input.sort_order ?? 0;

  await query(
    `INSERT INTO asset_types (id, code, name, sort_order) VALUES (?, ?, ?, ?)`,
    [id, code, input.name.trim(), sortOrder]
  );

  const row = await getAssetTypeById(id);
  return row!;
}

export async function updateAssetType(
  id: string,
  input: Partial<{ name: string; sort_order: number; is_active: boolean }>
): Promise<AssetTypeRow | null> {
  const existing = await getAssetTypeById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name.trim());
  }
  if (input.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(input.sort_order);
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }

  if (fields.length === 0) return existing;

  await query(`UPDATE asset_types SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  return getAssetTypeById(id);
}

export async function deleteAssetType(id: string): Promise<void> {
  const inUse = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM units WHERE asset_type_id = ?',
    [id]
  );
  if ((inUse?.total ?? 0) > 0) {
    throw new AppError(
      409,
      'Tipu nevar dzēst — ir saistīti aktīvi. Deaktivizējiet tipu.',
      'ASSET_TYPE_IN_USE'
    );
  }

  await query('DELETE FROM asset_type_components WHERE asset_type_id = ?', [id]);
  await query('DELETE FROM asset_types WHERE id = ?', [id]);
}

export async function createAssetTypeComponent(
  assetTypeId: string,
  input: { name: string; sort_order?: number }
): Promise<AssetTypeComponentRow> {
  const type = await getAssetTypeById(assetTypeId);
  if (!type) throw new AppError(404, 'Tips nav atrasts', 'NOT_FOUND');

  const id = uuidv4();
  await query(
    `INSERT INTO asset_type_components (id, asset_type_id, name, sort_order) VALUES (?, ?, ?, ?)`,
    [id, assetTypeId, input.name.trim(), input.sort_order ?? 0]
  );

  const row = await queryOne<AssetTypeComponentRow>(
    'SELECT * FROM asset_type_components WHERE id = ?',
    [id]
  );
  return row!;
}

export async function updateAssetTypeComponent(
  id: string,
  input: Partial<{ name: string; sort_order: number; is_active: boolean }>
): Promise<AssetTypeComponentRow | null> {
  const existing = await queryOne<AssetTypeComponentRow>(
    'SELECT * FROM asset_type_components WHERE id = ?',
    [id]
  );
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name.trim());
  }
  if (input.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(input.sort_order);
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }

  if (fields.length === 0) return existing;

  await query(`UPDATE asset_type_components SET ${fields.join(', ')} WHERE id = ?`, [
    ...values,
    id,
  ]);

  return queryOne<AssetTypeComponentRow>('SELECT * FROM asset_type_components WHERE id = ?', [id]);
}

export async function deleteAssetTypeComponent(id: string): Promise<void> {
  const inUseUnits = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM units WHERE asset_component_id = ?',
    [id]
  );
  const inUseIncidents = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM incidents WHERE asset_component_id = ?',
    [id]
  );
  if ((inUseUnits?.total ?? 0) > 0 || (inUseIncidents?.total ?? 0) > 0) {
    throw new AppError(
      409,
      'Apakšsadaļu nevar dzēst — tā tiek izmantota. Deaktivizējiet to.',
      'ASSET_COMPONENT_IN_USE'
    );
  }

  await query('DELETE FROM asset_type_components WHERE id = ?', [id]);
}
