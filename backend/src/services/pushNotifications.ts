import crypto from 'crypto';
import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { listAssignableStaffUserIds } from './incidentAssignment';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@trioit.lv';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return configureVapid();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function hashEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

export async function upsertPushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string | null
): Promise<void> {
  const endpointHash = hashEndpoint(endpoint);
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM push_subscriptions WHERE endpoint_hash = ?',
    [endpointHash]
  );

  if (existing) {
    await query(
      `UPDATE push_subscriptions
       SET user_id = ?, endpoint = ?, p256dh = ?, auth = ?, user_agent = ?
       WHERE endpoint_hash = ?`,
      [userId, endpoint, p256dh, auth, userAgent ?? null, endpointHash]
    );
    return;
  }

  await query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, endpoint, endpointHash, p256dh, auth, userAgent ?? null]
  );
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [
    userId,
    hashEndpoint(endpoint),
  ]);
}

async function listSubscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];

  const placeholders = userIds.map(() => '?').join(', ');
  return query<PushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id IN (${placeholders})`,
    userIds
  );
}

async function deleteSubscriptionById(id: string): Promise<void> {
  await query('DELETE FROM push_subscriptions WHERE id = ?', [id]);
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  excludeUserId?: string | null
): Promise<void> {
  if (!configureVapid()) return;

  const recipients = [...new Set(userIds.filter((id) => id && id !== excludeUserId))];
  if (recipients.length === 0) return;

  const subscriptions = await listSubscriptionsForUsers(recipients);
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionById(sub.id);
        } else {
          console.error('[push] send failed:', statusCode || err);
        }
      }
    })
  );
}

export function firePush(task: () => Promise<void>): void {
  task().catch((err) => console.error('[push] notification error:', err));
}

export async function notifyNewIncident(params: {
  incidentId: string;
  incidentNumber: string;
  title: string;
  objectName?: string | null;
  assignedTo: string | null;
  excludeUserId?: string | null;
}): Promise<void> {
  const userIds = params.assignedTo
    ? [params.assignedTo]
    : await listAssignableStaffUserIds();

  const body = params.objectName
    ? `${params.objectName} — ${params.title}`
    : params.title;

  await sendPushToUsers(
    userIds,
    {
      title: `Jauns izsaukums ${params.incidentNumber}`,
      body,
      url: `/incidents/${params.incidentId}`,
      tag: `incident-${params.incidentId}`,
    },
    params.excludeUserId
  );
}

export async function notifyPortalChatMessage(params: {
  incidentId: string;
  incidentNumber: string;
  authorName: string;
  messagePreview: string;
  assignedTo: string | null;
}): Promise<void> {
  const userIds = params.assignedTo
    ? [params.assignedTo]
    : await listAssignableStaffUserIds();

  const preview =
    params.messagePreview.length > 120
      ? `${params.messagePreview.slice(0, 117)}...`
      : params.messagePreview;

  await sendPushToUsers(userIds, {
    title: `Čats: ${params.incidentNumber}`,
    body: `${params.authorName}: ${preview}`,
    url: `/incidents/${params.incidentId}`,
    tag: `chat-${params.incidentId}`,
  });
}

export async function notifyIncidentReassigned(params: {
  incidentId: string;
  incidentNumber: string;
  title: string;
  assigneeId: string;
  excludeUserId?: string | null;
}): Promise<void> {
  await sendPushToUsers(
    [params.assigneeId],
    {
      title: `Pārvirzīts izsaukums ${params.incidentNumber}`,
      body: params.title,
      url: `/incidents/${params.incidentId}`,
      tag: `incident-${params.incidentId}`,
    },
    params.excludeUserId
  );
}
