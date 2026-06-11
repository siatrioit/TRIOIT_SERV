import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import type { ClientObject } from '../models/types';
import type { ClientObjectInput } from '../schemas/clientObject';

export async function listClientObjects(clientId: string): Promise<ClientObject[]> {
  return query<ClientObject>(
    `SELECT * FROM client_objects
     WHERE client_id = ? AND is_active = 1
     ORDER BY is_primary DESC, name ASC`,
    [clientId]
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
      'UPDATE client_objects SET is_primary = 0 WHERE client_id = ?',
      [clientId]
    );
  }

  await query(
    `INSERT INTO client_objects (
      id, client_id, name, object_code, address, city, postal_code, country,
      latitude, longitude, contact_name, contact_phone, contact_email,
      access_notes, notes, is_primary, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.is_primary ? 1 : 0,
      createdBy ?? null,
    ]
  );

  const row = await queryOne<ClientObject>(
    'SELECT * FROM client_objects WHERE id = ?',
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
    'SELECT id FROM client_objects WHERE id = ? AND client_id = ? AND is_active = 1',
    [objectId, clientId]
  );
  if (!existing) return null;

  if (input.is_primary) {
    await query(
      'UPDATE client_objects SET is_primary = 0 WHERE client_id = ?',
      [clientId]
    );
  }

  const fields = Object.keys(input).filter((k) => k !== 'id');
  if (fields.length === 0) {
    return queryOne<ClientObject>('SELECT * FROM client_objects WHERE id = ?', [objectId]);
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

  return queryOne<ClientObject>('SELECT * FROM client_objects WHERE id = ?', [objectId]);
}

export async function syncClientObjects(
  clientId: string,
  objects: ClientObjectInput[],
  createdBy?: string
): Promise<ClientObject[]> {
  const existing = await listClientObjects(clientId);
  const keepIds = new Set(
    objects.map((o) => o.id).filter((id): id is string => Boolean(id))
  );

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await query(
        'UPDATE client_objects SET is_active = 0 WHERE id = ? AND client_id = ?',
        [row.id, clientId]
      );
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

  return result.sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.name.localeCompare(b.name, 'lv');
  });
}
