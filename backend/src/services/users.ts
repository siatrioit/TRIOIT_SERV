import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { UserRole } from '../models/types';
import type { createUserSchema, updateUserSchema } from '../schemas/user';
import type { z } from 'zod';

export type StaffUser = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean | number;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

export async function listStaffUsers(): Promise<StaffUser[]> {
  return query<StaffUser>(
    `SELECT id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at
     FROM users ORDER BY full_name ASC`
  );
}

export async function getStaffUser(id: string): Promise<StaffUser | null> {
  return queryOne<StaffUser>(
    `SELECT id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at
     FROM users WHERE id = ?`,
    [id]
  );
}

export async function createStaffUser(input: CreateUserInput): Promise<StaffUser> {
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [input.email]);
  if (existing) {
    throw new AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');
  }

  const portalExisting = await queryOne('SELECT id FROM portal_users WHERE email = ?', [
    input.email,
  ]);
  if (portalExisting) {
    throw new AppError(409, 'E-pasts jau izmantots klientu portālā', 'EMAIL_EXISTS');
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await query(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.email, passwordHash, input.full_name, input.phone ?? null, input.role]
  );

  const user = await getStaffUser(id);
  return user!;
}

export async function updateStaffUser(
  id: string,
  input: UpdateUserInput,
  actorId: string
): Promise<StaffUser | null> {
  const existing = await getStaffUser(id);
  if (!existing) return null;

  if (input.is_active === false && id === actorId) {
    throw new AppError(400, 'Nevar deaktivizēt pašu kontu', 'SELF_DEACTIVATE');
  }

  if (input.role && input.role !== 'admin' && existing.role === 'admin') {
    const adminCount = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 1`
    );
    if ((adminCount?.total ?? 0) <= 1) {
      throw new AppError(400, 'Jāpaliek vismaz vienam administratoram', 'LAST_ADMIN');
    }
  }

  if (input.email && input.email !== existing.email) {
    const emailTaken = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [
      input.email,
      id,
    ]);
    if (emailTaken) {
      throw new AppError(409, 'E-pasts jau reģistrēts', 'EMAIL_EXISTS');
    }
    const portalTaken = await queryOne('SELECT id FROM portal_users WHERE email = ?', [
      input.email,
    ]);
    if (portalTaken) {
      throw new AppError(409, 'E-pasts jau izmantots klientu portālā', 'EMAIL_EXISTS');
    }
  }

  const fields = Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined);
  if (fields.length === 0) return existing;

  const setParts: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (field === 'password') {
      const hash = await bcrypt.hash(input.password!, 10);
      setParts.push('password_hash = ?');
      values.push(hash);
      continue;
    }
    setParts.push(`${field} = ?`);
    const v = (input as Record<string, unknown>)[field];
    values.push(field === 'is_active' ? (v ? 1 : 0) : (v ?? null));
  }

  await query(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`, [...values, id]);
  return getStaffUser(id);
}
