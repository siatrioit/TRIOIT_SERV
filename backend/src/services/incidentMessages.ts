import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { assertCanViewIncident, type PortalAccessGrant } from './portalScope';
import { assertPortalCanSendChat } from './portalPermissions';

export type IncidentMessage = {
  id: string;
  incident_id: string;
  author_type: 'staff' | 'portal';
  author_name: string;
  body: string;
  created_at: string;
  is_unread?: boolean;
};

export async function getLastReadAt(
  incidentId: string,
  readerType: 'staff' | 'portal',
  readerId: string
): Promise<string | null> {
  const row = await queryOne<{ last_read_at: string }>(
    `SELECT last_read_at FROM incident_message_reads
     WHERE incident_id = ? AND reader_type = ? AND reader_id = ?`,
    [incidentId, readerType, readerId]
  );
  return row?.last_read_at ?? null;
}

export async function getPortalReadWatermark(
  incidentId: string,
  portalUserId: string
): Promise<string> {
  const row = await queryOne<{ watermark: string }>(
    `SELECT GREATEST(
      COALESCE(
        (SELECT last_read_at FROM incident_message_reads
         WHERE incident_id = ? AND reader_type = 'portal' AND reader_id = ?),
        '1970-01-01 00:00:00'
      ),
      COALESCE(
        (SELECT MAX(created_at) FROM incident_messages
         WHERE incident_id = ? AND author_type = 'portal' AND author_portal_id = ?),
        '1970-01-01 00:00:00'
      )
    ) AS watermark`,
    [incidentId, portalUserId, incidentId, portalUserId]
  );
  return row?.watermark ?? '1970-01-01 00:00:00';
}

export async function listIncidentMessagesWithReadState(
  incidentId: string,
  readerType: 'staff' | 'portal',
  readerId: string
): Promise<IncidentMessage[]> {
  const messages = await listIncidentMessages(incidentId);
  const cutoff =
    readerType === 'portal'
      ? await getPortalReadWatermark(incidentId, readerId)
      : (await getLastReadAt(incidentId, readerType, readerId)) ?? '1970-01-01 00:00:00';
  const unreadFrom = readerType === 'portal' ? 'staff' : 'portal';

  return messages.map((m) => ({
    ...m,
    is_unread: m.author_type === unreadFrom && m.created_at > cutoff,
  }));
}

export async function assertIncidentExists(incidentId: string): Promise<void> {
  const row = await queryOne('SELECT id FROM incidents WHERE id = ?', [incidentId]);
  if (!row) throw new AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
}

export async function listIncidentMessages(incidentId: string): Promise<IncidentMessage[]> {
  return query<IncidentMessage>(
    `SELECT id, incident_id, author_type, author_name, body, created_at
     FROM incident_messages
     WHERE incident_id = ?
     ORDER BY created_at ASC`,
    [incidentId]
  );
}

export async function addStaffMessage(
  incidentId: string,
  staffUserId: string,
  body: string
): Promise<IncidentMessage> {
  await assertIncidentExists(incidentId);

  const user = await queryOne<{ full_name: string }>(
    'SELECT full_name FROM users WHERE id = ? AND is_active = 1',
    [staffUserId]
  );
  if (!user) throw new AppError(403, 'Lietotājs nav aktīvs', 'FORBIDDEN');

  const id = uuidv4();
  await query(
    `INSERT INTO incident_messages (id, incident_id, author_type, author_staff_id, author_name, body)
     VALUES (?, ?, 'staff', ?, ?, ?)`,
    [id, incidentId, staffUserId, user.full_name, body.trim()]
  );

  const message = await queryOne<IncidentMessage>(
    'SELECT id, incident_id, author_type, author_name, body, created_at FROM incident_messages WHERE id = ?',
    [id]
  );
  return message!;
}

export async function addPortalMessage(
  incidentId: string,
  portalUserId: string,
  grants: PortalAccessGrant[],
  body: string
): Promise<IncidentMessage> {
  await assertCanViewIncident(grants, incidentId);
  await assertPortalCanSendChat(grants, incidentId);

  const user = await queryOne<{ full_name: string }>(
    'SELECT full_name FROM portal_users WHERE id = ? AND is_active = 1',
    [portalUserId]
  );
  if (!user) throw new AppError(403, 'Lietotājs nav aktīvs', 'FORBIDDEN');

  const id = uuidv4();
  await query(
    `INSERT INTO incident_messages (id, incident_id, author_type, author_portal_id, author_name, body)
     VALUES (?, ?, 'portal', ?, ?, ?)`,
    [id, incidentId, portalUserId, user.full_name, body.trim()]
  );

  const message = await queryOne<IncidentMessage>(
    'SELECT id, incident_id, author_type, author_name, body, created_at FROM incident_messages WHERE id = ?',
    [id]
  );

  await markIncidentRead(incidentId, 'portal', portalUserId);

  return message!;
}

export async function markIncidentRead(
  incidentId: string,
  readerType: 'staff' | 'portal',
  readerId: string
): Promise<void> {
  const maxRow = await queryOne<{ latest: string | null }>(
    'SELECT MAX(created_at) AS latest FROM incident_messages WHERE incident_id = ?',
    [incidentId]
  );
  const readAt = maxRow?.latest ?? new Date().toISOString().slice(0, 19).replace('T', ' ');

  await query(
    `INSERT INTO incident_message_reads (incident_id, reader_type, reader_id, last_read_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_read_at = GREATEST(last_read_at, VALUES(last_read_at))`,
    [incidentId, readerType, readerId, readAt]
  );
}

export async function countUnreadForPortal(
  incidentId: string,
  portalUserId: string
): Promise<number> {
  const watermark = await getPortalReadWatermark(incidentId, portalUserId);
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM incident_messages m
     WHERE m.incident_id = ?
       AND m.author_type = 'staff'
       AND m.created_at > ?`,
    [incidentId, watermark]
  );
  return row?.total ?? 0;
}

/** SQL fragments for portal incident list unread_count (3× same portalUserId param). */
export const PORTAL_UNREAD_COUNT_SQL = `(SELECT COUNT(*) FROM incident_messages m
  WHERE m.incident_id = i.id AND m.author_type = 'staff'
  AND m.created_at > COALESCE(
    (SELECT GREATEST(
      COALESCE(r.last_read_at, '1970-01-01 00:00:00'),
      COALESCE(
        (SELECT MAX(p.created_at) FROM incident_messages p
         WHERE p.incident_id = i.id AND p.author_type = 'portal' AND p.author_portal_id = ?),
        '1970-01-01 00:00:00'
      )
    )
    FROM incident_message_reads r
    WHERE r.incident_id = i.id AND r.reader_type = 'portal' AND r.reader_id = ?),
    COALESCE(
      (SELECT MAX(p.created_at) FROM incident_messages p
       WHERE p.incident_id = i.id AND p.author_type = 'portal' AND p.author_portal_id = ?),
      '1970-01-01 00:00:00'
    )
  ))`;

export async function countUnreadForStaff(
  incidentId: string,
  staffUserId: string
): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM incident_messages m
     WHERE m.incident_id = ?
       AND m.author_type = 'portal'
       AND m.created_at > COALESCE(
         (SELECT r.last_read_at FROM incident_message_reads r
          WHERE r.incident_id = m.incident_id AND r.reader_type = 'staff' AND r.reader_id = ?),
         '1970-01-01 00:00:00'
       )`,
    [incidentId, staffUserId]
  );
  return row?.total ?? 0;
}
