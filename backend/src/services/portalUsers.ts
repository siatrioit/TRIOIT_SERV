import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { PortalRole } from './portalPermissions';
import { normalizePortalRole } from './portalPermissions';

export type PortalUserAccessSummary = {
  id: string;
  client_id: string;
  client_name: string;
  object_id: string | null;
  object_name: string | null;
  scope: 'client' | 'object';
  portal_role: PortalRole;
};

export type PortalUserAdmin = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean | number;
  created_at: string;
  access: PortalUserAccessSummary[];
};

function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}

export async function listAllPortalUsers(): Promise<PortalUserAdmin[]> {
  const users = await query<{
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    is_active: boolean | number;
    created_at: string;
  }>(
    `SELECT id, email, full_name, phone, is_active, created_at
     FROM portal_users
     ORDER BY full_name ASC`
  );

  if (users.length === 0) return [];

  const accesses = await query<
    PortalUserAccessSummary & { portal_user_id: string }
  >(
    `SELECT pa.id, pa.portal_user_id, pa.client_id, pa.object_id, pa.scope, pa.portal_role,
            c.name AS client_name, co.name AS object_name
     FROM portal_access pa
     JOIN clients c ON c.id = pa.client_id
     LEFT JOIN client_objects co ON co.id = pa.object_id
     WHERE pa.is_active = 1
     ORDER BY c.name ASC, co.name ASC`
  );

  const byUser = new Map<string, PortalUserAccessSummary[]>();
  for (const row of accesses) {
    const list = byUser.get(row.portal_user_id) ?? [];
    list.push({
      id: row.id,
      client_id: row.client_id,
      client_name: row.client_name,
      object_id: row.object_id,
      object_name: row.object_name,
      scope: row.scope,
      portal_role: normalizePortalRole(row.portal_role),
    });
    byUser.set(row.portal_user_id, list);
  }

  return users.map((user) => ({
    ...user,
    access: byUser.get(user.id) ?? [],
  }));
}

export async function getPortalUserAdmin(id: string): Promise<PortalUserAdmin | null> {
  const users = await listAllPortalUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function updatePortalUser(
  id: string,
  input: {
    email?: string;
    full_name?: string;
    phone?: string | null;
    is_active?: boolean;
  }
): Promise<PortalUserAdmin | null> {
  const existing = await queryOne('SELECT id FROM portal_users WHERE id = ?', [id]);
  if (!existing) return null;

  if (input.email) {
    const taken = await queryOne('SELECT id FROM portal_users WHERE email = ? AND id != ?', [
      input.email,
      id,
    ]);
    if (taken) throw new AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');

    const staffTaken = await queryOne('SELECT id FROM users WHERE email = ?', [input.email]);
    if (staffTaken) throw new AppError(409, 'E-pasts jau izmantots darbinieku kontā', 'EMAIL_EXISTS');
  }

  const fields = Object.keys(input).filter(
    (k) => (input as Record<string, unknown>)[k] !== undefined
  );
  if (fields.length > 0) {
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => {
      const v = (input as Record<string, unknown>)[f];
      return f === 'is_active' ? (v ? 1 : 0) : (v ?? null);
    });
    await query(`UPDATE portal_users SET ${setClause} WHERE id = ?`, [...values, id]);
  }

  return getPortalUserAdmin(id);
}

export async function resetPortalUserPassword(
  id: string,
  password?: string
): Promise<string> {
  const existing = await queryOne('SELECT id FROM portal_users WHERE id = ?', [id]);
  if (!existing) throw new AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');

  const newPassword = password?.trim() || generatePassword();
  if (newPassword.length < 8) {
    throw new AppError(400, 'Parolei jābūt vismaz 8 rakstzīmēm', 'INVALID_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE portal_users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  return newPassword;
}

export async function updatePortalAccessRole(
  accessId: string,
  portalRole: PortalRole
): Promise<void> {
  const row = await queryOne('SELECT id FROM portal_access WHERE id = ? AND is_active = 1', [
    accessId,
  ]);
  if (!row) throw new AppError(404, 'Pieeja nav atrasta', 'NOT_FOUND');

  await query('UPDATE portal_access SET portal_role = ? WHERE id = ?', [portalRole, accessId]);
}
