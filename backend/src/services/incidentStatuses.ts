import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

export type IncidentStatusCategory = 'open' | 'closed';
export type UnitStatusCode = 'active' | 'repair' | 'decommissioned' | 'spare';

export interface IncidentStatusRow {
  id: string;
  code: string;
  label: string;
  category: IncidentStatusCategory;
  sort_order: number;
  badge_tone: string | null;
  sync_unit_status: UnitStatusCode | null;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

const VALID_UNIT_STATUSES: UnitStatusCode[] = ['active', 'repair', 'decommissioned', 'spare'];

let cache: IncidentStatusRow[] | null = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

function slugifyCode(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'status'
  );
}

export function invalidateIncidentStatusCache(): void {
  cache = null;
  cacheAt = 0;
}

export async function listIncidentStatuses(activeOnly = true): Promise<IncidentStatusRow[]> {
  const useCache = activeOnly && cache && Date.now() - cacheAt < CACHE_MS;
  if (useCache) return cache!;

  const where = activeOnly ? 'WHERE is_active = 1' : '';
  const rows = await query<IncidentStatusRow>(
    `SELECT * FROM incident_statuses ${where} ORDER BY sort_order ASC, label ASC`
  );

  if (activeOnly) {
    cache = rows;
    cacheAt = Date.now();
  }
  return rows;
}

export async function getOpenStatusCodes(): Promise<string[]> {
  const rows = await listIncidentStatuses(true);
  return rows.filter((r) => r.category === 'open').map((r) => r.code);
}

export async function getClosedStatusCodes(): Promise<string[]> {
  const rows = await listIncidentStatuses(true);
  return rows.filter((r) => r.category === 'closed').map((r) => r.code);
}

export async function assertValidIncidentStatus(code: string): Promise<IncidentStatusRow> {
  const row = await queryOne<IncidentStatusRow>(
    'SELECT * FROM incident_statuses WHERE code = ? AND is_active = 1',
    [code]
  );
  if (!row) {
    throw new AppError(400, 'Nederīgs atgadījuma statuss', 'INVALID_STATUS');
  }
  return row;
}

export async function getDefaultIncidentStatusCode(): Promise<string> {
  const rows = await listIncidentStatuses(true);
  const pending = rows.find((r) => r.code === 'pending');
  return pending?.code ?? rows[0]?.code ?? 'pending';
}

export async function isClosedIncidentStatus(code: string): Promise<boolean> {
  const row = await queryOne<{ category: IncidentStatusCategory }>(
    'SELECT category FROM incident_statuses WHERE code = ? AND is_active = 1',
    [code]
  );
  return row?.category === 'closed';
}

export async function createIncidentStatus(input: {
  label: string;
  code?: string;
  category?: IncidentStatusCategory;
  sort_order?: number;
  badge_tone?: string | null;
  sync_unit_status?: UnitStatusCode | null;
}): Promise<IncidentStatusRow> {
  let code = input.code?.trim() || slugifyCode(input.label);
  const existingCode = await queryOne('SELECT id FROM incident_statuses WHERE code = ?', [code]);
  if (existingCode) {
    code = `${code}_${Date.now().toString(36).slice(-4)}`;
  }

  if (input.sync_unit_status && !VALID_UNIT_STATUSES.includes(input.sync_unit_status)) {
    throw new AppError(400, 'Nederīgs aktīva statuss', 'INVALID_UNIT_STATUS');
  }

  const id = uuidv4();
  const sortOrder =
    input.sort_order ??
    (await queryOne<{ next: number }>('SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM incident_statuses'))
      ?.next ??
    10;

  await query(
    `INSERT INTO incident_statuses (id, code, label, category, sort_order, badge_tone, sync_unit_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      input.label.trim(),
      input.category ?? 'open',
      sortOrder,
      input.badge_tone ?? 'gray',
      input.sync_unit_status ?? null,
    ]
  );

  invalidateIncidentStatusCache();
  return (await queryOne<IncidentStatusRow>('SELECT * FROM incident_statuses WHERE id = ?', [id]))!;
}

export async function updateIncidentStatus(
  id: string,
  input: {
    label?: string;
    category?: IncidentStatusCategory;
    sort_order?: number;
    badge_tone?: string | null;
    sync_unit_status?: UnitStatusCode | null;
    is_active?: boolean;
  }
): Promise<IncidentStatusRow | null> {
  const existing = await queryOne<IncidentStatusRow>('SELECT * FROM incident_statuses WHERE id = ?', [id]);
  if (!existing) return null;

  if (input.sync_unit_status && !VALID_UNIT_STATUSES.includes(input.sync_unit_status)) {
    throw new AppError(400, 'Nederīgs aktīva statuss', 'INVALID_UNIT_STATUS');
  }

  const updates: Record<string, unknown> = {};
  if (input.label !== undefined) updates.label = input.label.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.badge_tone !== undefined) updates.badge_tone = input.badge_tone;
  if (input.sync_unit_status !== undefined) updates.sync_unit_status = input.sync_unit_status;
  if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;

  const fields = Object.keys(updates);
  if (fields.length === 0) return existing;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  await query(`UPDATE incident_statuses SET ${setClause} WHERE id = ?`, [
    ...fields.map((f) => updates[f] ?? null),
    id,
  ]);

  invalidateIncidentStatusCache();
  return queryOne<IncidentStatusRow>('SELECT * FROM incident_statuses WHERE id = ?', [id]);
}

export async function deleteIncidentStatus(id: string): Promise<void> {
  const row = await queryOne<IncidentStatusRow>('SELECT * FROM incident_statuses WHERE id = ?', [id]);
  if (!row) throw new AppError(404, 'Statuss nav atrasts', 'NOT_FOUND');

  const inUse = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM incidents WHERE status = ?',
    [row.code]
  );
  if ((inUse?.total ?? 0) > 0) {
    throw new AppError(
      409,
      'Statusu nevar dzēst — ir saistīti atgadījumi. Varat deaktivizēt.',
      'STATUS_IN_USE'
    );
  }

  await query('DELETE FROM incident_statuses WHERE id = ?', [id]);
  invalidateIncidentStatusCache();
}

export function statusByCode(rows: IncidentStatusRow[]): Map<string, IncidentStatusRow> {
  return new Map(rows.map((r) => [r.code, r]));
}

const FALLBACK_OPEN = ['pending', 'in_progress', 'paused'];
const FALLBACK_CLOSED = ['completed', 'cancelled'];

export async function sqlInActiveStatusCodes(
  category?: 'open' | 'closed'
): Promise<{ fragment: string; codes: string[] }> {
  const rows = await listIncidentStatuses(true);
  let codes: string[];
  if (category === 'open') {
    codes = rows.filter((r) => r.category === 'open').map((r) => r.code);
    if (codes.length === 0) codes = [...FALLBACK_OPEN];
  } else if (category === 'closed') {
    codes = rows.filter((r) => r.category === 'closed').map((r) => r.code);
    if (codes.length === 0) codes = [...FALLBACK_CLOSED];
  } else {
    codes = rows.map((r) => r.code);
  }
  return { fragment: codes.map(() => '?').join(', '), codes };
}
