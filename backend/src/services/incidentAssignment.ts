import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { UserRole } from '../models/types';

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'manager', 'technician'];

export type AssignableStaff = {
  id: string;
  full_name: string;
  role: UserRole;
};

export async function listAssignableStaff(): Promise<AssignableStaff[]> {
  return query<AssignableStaff>(
    `SELECT id, full_name, role
     FROM users
     WHERE is_active = 1 AND role IN ('admin', 'manager', 'technician')
     ORDER BY full_name ASC`
  );
}

export async function listAssignableStaffUserIds(): Promise<string[]> {
  const rows = await listAssignableStaff();
  return rows.map((row) => row.id);
}

export async function assertAssignableUser(userId: string): Promise<AssignableStaff> {
  const user = await queryOne<AssignableStaff>(
    `SELECT id, full_name, role
     FROM users
     WHERE id = ? AND is_active = 1 AND role IN ('admin', 'manager', 'technician')`,
    [userId]
  );
  if (!user) {
    throw new AppError(400, 'Lietotājs nav pieejams piešķiršanai', 'INVALID_ASSIGNEE');
  }
  return user;
}

export async function getObjectDefaultAssignee(objectId: string | null | undefined): Promise<string | null> {
  if (!objectId) return null;

  const row = await queryOne<{ assigned_user_id: string | null }>(
    `SELECT co.assigned_user_id
     FROM client_objects co
     WHERE co.id = ? AND co.is_active = 1`,
    [objectId]
  );
  if (!row?.assigned_user_id) return null;

  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users
     WHERE id = ? AND is_active = 1 AND role IN ('admin', 'manager', 'technician')`,
    [row.assigned_user_id]
  );
  return user?.id ?? null;
}

/** Ja nav norādīts explicit — ņem no objekta; viewer netiek piešķirts */
export async function resolveIncidentAssignee(
  objectId: string | null | undefined,
  explicitAssignedTo?: string | null
): Promise<string | null> {
  if (explicitAssignedTo) {
    const user = await assertAssignableUser(explicitAssignedTo);
    return user.id;
  }
  return getObjectDefaultAssignee(objectId);
}

export function isAssignableRole(role: UserRole): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}
