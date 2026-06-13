import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';

export type UnitActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'linked_to_parent'
  | 'moved_to_parent'
  | 'unlinked_from_parent'
  | 'deleted';

export interface UnitActivityEntry {
  id: string;
  unit_id: string;
  action: UnitActivityAction;
  description: string;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type UnitActor = {
  userId: string;
  userName: string;
};

export async function resolveStaffActorName(userId: string): Promise<string> {
  const row = await queryOne<{ full_name: string }>(
    'SELECT full_name FROM users WHERE id = ?',
    [userId]
  );
  return row?.full_name ?? 'Darbinieks';
}

export async function logUnitActivity(
  unitId: string,
  action: UnitActivityAction,
  description: string,
  actor?: UnitActor | null,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  await query(
    `INSERT INTO unit_activity_log (id, unit_id, action, description, actor_user_id, actor_name, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      unitId,
      action,
      description,
      actor?.userId ?? null,
      actor?.userName ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

export async function listUnitActivity(unitId: string): Promise<UnitActivityEntry[]> {
  return query<UnitActivityEntry>(
    `SELECT id, unit_id, action, description, actor_user_id, actor_name, metadata, created_at
     FROM unit_activity_log
     WHERE unit_id = ?
     ORDER BY created_at DESC
     LIMIT 200`,
    [unitId]
  );
}
