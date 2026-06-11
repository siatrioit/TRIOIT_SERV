import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { createPortalAccessSchema } from '../schemas/portalAccess';
import type { z } from 'zod';

export type PortalAccessRow = {
  id: string;
  portal_user_id: string;
  client_id: string;
  object_id: string | null;
  scope: 'client' | 'object';
  is_active: boolean | number;
  created_at: string;
  email: string;
  full_name: string;
  phone?: string | null;
  user_active: boolean | number;
  object_name?: string | null;
};

type CreatePortalAccessInput = z.infer<typeof createPortalAccessSchema>;

function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}

export async function listPortalAccess(
  clientId: string,
  objectId?: string
): Promise<PortalAccessRow[]> {
  if (objectId) {
    return query<PortalAccessRow>(
      `SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.is_active,
              pa.created_at, pu.email, pu.full_name, pu.phone, pu.is_active AS user_active,
              co.name AS object_name
       FROM portal_access pa
       JOIN portal_users pu ON pu.id = pa.portal_user_id
       LEFT JOIN client_objects co ON co.id = pa.object_id
       WHERE pa.client_id = ? AND pa.object_id = ? AND pa.is_active = 1
       ORDER BY pu.full_name ASC`,
      [clientId, objectId]
    );
  }

  return query<PortalAccessRow>(
    `SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.is_active,
            pa.created_at, pu.email, pu.full_name, pu.phone, pu.is_active AS user_active,
            co.name AS object_name
     FROM portal_access pa
     JOIN portal_users pu ON pu.id = pa.portal_user_id
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.client_id = ? AND pa.is_active = 1
     ORDER BY pa.scope ASC, pu.full_name ASC`,
    [clientId]
  );
}

async function findOrCreatePortalUser(
  input: CreatePortalAccessInput,
  createdBy?: string
): Promise<{ userId: string; temporaryPassword?: string }> {
  const existing = await queryOne<{ id: string }>('SELECT id FROM portal_users WHERE email = ?', [
    input.email,
  ]);

  if (existing) {
    return { userId: existing.id };
  }

  const staffExisting = await queryOne('SELECT id FROM users WHERE email = ?', [input.email]);
  if (staffExisting) {
    throw new AppError(409, 'E-pasts jau izmantots darbinieku kontā', 'EMAIL_EXISTS');
  }

  const temporaryPassword = input.password ?? generatePassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const userId = uuidv4();

  await query(
    `INSERT INTO portal_users (id, email, password_hash, full_name, phone, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, input.email, passwordHash, input.full_name, input.phone ?? null, createdBy ?? null]
  );

  return input.password ? { userId } : { userId, temporaryPassword };
}

async function assertAccessNotDuplicate(
  portalUserId: string,
  clientId: string,
  scope: 'client' | 'object',
  objectId?: string
): Promise<void> {
  if (scope === 'client') {
    const dup = await queryOne(
      `SELECT id FROM portal_access
       WHERE portal_user_id = ? AND client_id = ? AND scope = 'client' AND is_active = 1`,
      [portalUserId, clientId]
    );
    if (dup) {
      throw new AppError(409, 'Lietotājam jau ir pieeja visam klientam', 'ACCESS_EXISTS');
    }
    return;
  }

  const dup = await queryOne(
    `SELECT id FROM portal_access
     WHERE portal_user_id = ? AND client_id = ? AND object_id = ? AND is_active = 1`,
    [portalUserId, clientId, objectId]
  );
  if (dup) {
    throw new AppError(409, 'Lietotājam jau ir pieeja šim objektam', 'ACCESS_EXISTS');
  }
}

export async function grantClientPortalAccess(
  clientId: string,
  input: CreatePortalAccessInput,
  createdBy?: string
): Promise<{ access: PortalAccessRow; temporaryPassword?: string }> {
  const client = await queryOne('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
    clientId,
  ]);
  if (!client) throw new AppError(404, 'Client not found', 'NOT_FOUND');

  const { userId, temporaryPassword } = await findOrCreatePortalUser(input, createdBy);
  await assertAccessNotDuplicate(userId, clientId, 'client');

  const accessId = uuidv4();
  await query(
    `INSERT INTO portal_access (id, portal_user_id, client_id, scope, created_by)
     VALUES (?, ?, ?, 'client', ?)`,
    [accessId, userId, clientId, createdBy ?? null]
  );

  const rows = await listPortalAccess(clientId);
  const access = rows.find((r) => r.id === accessId);
  if (!access) throw new AppError(500, 'Failed to load access');

  return { access, temporaryPassword };
}

export async function grantObjectPortalAccess(
  clientId: string,
  objectId: string,
  input: CreatePortalAccessInput,
  createdBy?: string
): Promise<{ access: PortalAccessRow; temporaryPassword?: string }> {
  const object = await queryOne(
    `SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`,
    [objectId, clientId]
  );
  if (!object) throw new AppError(404, 'Object not found', 'NOT_FOUND');

  const { userId, temporaryPassword } = await findOrCreatePortalUser(input, createdBy);
  await assertAccessNotDuplicate(userId, clientId, 'object', objectId);

  const accessId = uuidv4();
  await query(
    `INSERT INTO portal_access (id, portal_user_id, client_id, object_id, scope, created_by)
     VALUES (?, ?, ?, ?, 'object', ?)`,
    [accessId, userId, clientId, objectId, createdBy ?? null]
  );

  const rows = await listPortalAccess(clientId, objectId);
  const access = rows.find((r) => r.id === accessId);
  if (!access) throw new AppError(500, 'Failed to load access');

  return { access, temporaryPassword };
}

export async function revokePortalAccess(accessId: string): Promise<void> {
  const row = await queryOne('SELECT id FROM portal_access WHERE id = ? AND is_active = 1', [
    accessId,
  ]);
  if (!row) throw new AppError(404, 'Access not found', 'NOT_FOUND');

  await query('UPDATE portal_access SET is_active = 0 WHERE id = ?', [accessId]);
}
