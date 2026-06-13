import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { listIncidentStatuses } from './incidentStatuses';

export type IncidentActivityAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'completion_signed'
  | 'act_generated';

export interface IncidentActivityEntry {
  id: string;
  incident_id: string;
  action: IncidentActivityAction;
  description: string;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type IncidentActor = {
  userId: string;
  userName: string;
};

async function statusLabel(code: string): Promise<string> {
  const rows = await listIncidentStatuses(true);
  return rows.find((r) => r.code === code)?.label ?? code;
}

export async function logIncidentActivity(
  incidentId: string,
  action: IncidentActivityAction,
  description: string,
  actor?: IncidentActor | null,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  await query(
    `INSERT INTO incident_activity_log (id, incident_id, action, description, actor_user_id, actor_name, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      incidentId,
      action,
      description,
      actor?.userId ?? null,
      actor?.userName ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

export async function logIncidentCreated(
  incidentId: string,
  statusCode: string,
  actor?: IncidentActor | null
): Promise<void> {
  const label = await statusLabel(statusCode);
  await logIncidentActivity(
    incidentId,
    'created',
    `Reģistrēts atgadījums · statuss: ${label}`,
    actor,
    { status: statusCode }
  );
}

export async function logIncidentStatusChanged(
  incidentId: string,
  fromStatus: string,
  toStatus: string,
  actor?: IncidentActor | null,
  resolution?: string | null
): Promise<void> {
  const [fromLabel, toLabel] = await Promise.all([
    statusLabel(fromStatus),
    statusLabel(toStatus),
  ]);
  let description = `Statuss: ${fromLabel} → ${toLabel}`;
  if (resolution?.trim()) {
    description += ` · ${resolution.trim()}`;
  }
  await logIncidentActivity(incidentId, 'status_changed', description, actor, {
    from_status: fromStatus,
    to_status: toStatus,
    resolution: resolution?.trim() || null,
  });
}

export async function logIncidentAssigned(
  incidentId: string,
  assigneeName: string,
  actor?: IncidentActor | null
): Promise<void> {
  await logIncidentActivity(
    incidentId,
    'assigned',
    `Piešķirts: ${assigneeName}`,
    actor,
    { assignee_name: assigneeName }
  );
}

export async function listIncidentActivity(incidentId: string): Promise<IncidentActivityEntry[]> {
  return query<IncidentActivityEntry>(
    `SELECT id, incident_id, action, description, actor_user_id, actor_name, metadata, created_at
     FROM incident_activity_log
     WHERE incident_id = ?
     ORDER BY created_at DESC
     LIMIT 200`,
    [incidentId]
  );
}
