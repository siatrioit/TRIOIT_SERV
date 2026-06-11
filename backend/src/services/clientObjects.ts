import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { ClientObject } from '../models/types';
import type { ClientObjectInput } from '../schemas/clientObject';
import { assertAssignableUser } from './incidentAssignment';

export type ObjectStatus = 'active' | 'closed';

type ClientObjectRow = ClientObject & { incident_count?: number; assigned_user_name?: string | null };

const objectSelect = `co.*, u.full_name AS assigned_user_name`;

const objectJoin = `LEFT JOIN users u ON u.id = co.assigned_user_id AND u.is_active = 1`;

async function validateAssignedUserId(assignedUserId?: string | null): Promise<void> {
  if (assignedUserId) {
    await assertAssignableUser(assignedUserId);
  }
}

export async function countObjectIncidents(objectId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM incidents WHERE object_id = ?',
    [objectId]
  );
  return row?.total ?? 0;
}

export async function listClientObjects(
  clientId: string,
  status: ObjectStatus = 'active'
): Promise<ClientObjectRow[]> {
  return query<ClientObjectRow>(
    `SELECT ${objectSelect},
      (SELECT COUNT(*) FROM incidents i WHERE i.object_id = co.id) AS incident_count
     FROM client_objects co
     ${objectJoin}
     WHERE co.client_id = ? AND co.is_active = 1 AND co.status = ?
     ORDER BY co.name ASC`,
    [clientId, status]
  );
}

export async function getClientObject(
  clientId: string,
  objectId: string
): Promise<ClientObjectRow | null> {
  return queryOne<ClientObjectRow>(
    `SELECT ${objectSelect},
      (SELECT COUNT(*) FROM incidents i WHERE i.object_id = co.id) AS incident_count
     FROM client_objects co
     ${objectJoin}
     WHERE co.id = ? AND co.client_id = ? AND co.is_active = 1`,
    [objectId, clientId]
  );
}

export async function insertClientObject(
  clientId: string,
  input: ClientObjectInput,
  createdBy?: string
): Promise<ClientObject> {
  const id = input.id ?? uuidv4();

  if (input.is_primary) {
    await query(
      `UPDATE client_objects SET is_primary = 0
       WHERE client_id = ? AND status = 'active'`,
      [clientId]
    );
  }

  if (input.assigned_user_id) {
    await validateAssignedUserId(input.assigned_user_id);
  }

  await query(
    `INSERT INTO client_objects (
      id, client_id, name, object_code, address, city, postal_code, country,
      latitude, longitude, contact_name, contact_phone, contact_email,
      access_notes, notes, assigned_user_id, is_primary, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      id,
      clientId,
      input.name,
      input.object_code ?? null,
      input.address ?? null,
      input.city ?? null,
      input.postal_code ?? null,
      input.country ?? 'LV',
      input.latitude ?? null,
      input.longitude ?? null,
      input.contact_name ?? null,
      input.contact_phone ?? null,
      input.contact_email || null,
      input.access_notes ?? null,
      input.notes ?? null,
      input.assigned_user_id ?? null,
      input.is_primary ? 1 : 0,
      createdBy ?? null,
    ]
  );

  const row = await queryOne<ClientObjectRow>(
    `SELECT ${objectSelect} FROM client_objects co ${objectJoin} WHERE co.id = ?`,
    [id]
  );
  return row!;
}

export async function updateClientObject(
  clientId: string,
  objectId: string,
  input: Partial<ClientObjectInput>
): Promise<ClientObject | null> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1 AND status = 'active'`,
    [objectId, clientId]
  );
  if (!existing) return null;

  if (input.is_primary) {
    await query(
      `UPDATE client_objects SET is_primary = 0
       WHERE client_id = ? AND status = 'active'`,
      [clientId]
    );
  }

  if (input.assigned_user_id !== undefined) {
    await validateAssignedUserId(input.assigned_user_id);
  }

  const fields = Object.keys(input).filter((k) => k !== 'id');
  if (fields.length === 0) {
    return queryOne<ClientObjectRow>(
      `SELECT ${objectSelect} FROM client_objects co ${objectJoin} WHERE co.id = ?`,
      [objectId]
    );
  }

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => {
    const v = (input as Record<string, unknown>)[f];
    if (f === 'is_primary') return v ? 1 : 0;
    if (f === 'contact_email' && v === '') return null;
    return v ?? null;
  });

  await query(
    `UPDATE client_objects SET ${setClause} WHERE id = ? AND client_id = ?`,
    [...values, objectId, clientId]
  );

  return queryOne<ClientObjectRow>(
    `SELECT ${objectSelect} FROM client_objects co ${objectJoin} WHERE co.id = ?`,
    [objectId]
  );
}

export async function closeClientObject(
  clientId: string,
  objectId: string
): Promise<ClientObject | null> {
  const existing = await getClientObject(clientId, objectId);
  if (!existing || existing.status === 'closed') return null;

  await query(
    `UPDATE client_objects SET status = 'closed', is_primary = 0
     WHERE id = ? AND client_id = ?`,
    [objectId, clientId]
  );

  return queryOne<ClientObjectRow>(
    `SELECT ${objectSelect} FROM client_objects co ${objectJoin} WHERE co.id = ?`,
    [objectId]
  );
}

export async function reopenClientObject(
  clientId: string,
  objectId: string
): Promise<ClientObject | null> {
  const existing = await getClientObject(clientId, objectId);
  if (!existing || existing.status !== 'closed') return null;

  await query(
    `UPDATE client_objects SET status = 'active' WHERE id = ? AND client_id = ?`,
    [objectId, clientId]
  );

  return queryOne<ClientObjectRow>(
    `SELECT ${objectSelect} FROM client_objects co ${objectJoin} WHERE co.id = ?`,
    [objectId]
  );
}

export async function deleteClientObject(
  clientId: string,
  objectId: string
): Promise<void> {
  const existing = await getClientObject(clientId, objectId);
  if (!existing) {
    throw new AppError(404, 'Object not found', 'NOT_FOUND');
  }

  const incidents = await countObjectIncidents(objectId);
  if (incidents > 0) {
    throw new AppError(
      409,
      'Objektu nevar dzēst — ir saistīti izsaukumi. Slēdziet objektu.',
      'HAS_INCIDENTS'
    );
  }

  await query('DELETE FROM client_objects WHERE id = ? AND client_id = ?', [objectId, clientId]);
}

export async function syncClientObjects(
  clientId: string,
  objects: ClientObjectInput[],
  createdBy?: string
): Promise<ClientObject[]> {
  const existing = await listClientObjects(clientId, 'active');
  const keepIds = new Set(
    objects.map((o) => o.id).filter((id): id is string => Boolean(id))
  );

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await closeClientObject(clientId, row.id);
    }
  }

  const result: ClientObject[] = [];
  for (const obj of objects) {
    if (obj.id && keepIds.has(obj.id)) {
      const updated = await updateClientObject(clientId, obj.id, obj);
      if (updated) result.push(updated);
    } else {
      const { id: _id, ...rest } = obj;
      result.push(await insertClientObject(clientId, rest, createdBy));
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'lv'));
}
