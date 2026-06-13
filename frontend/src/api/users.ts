import { api } from './client';

export type StaffRole = 'admin' | 'manager' | 'technician' | 'viewer';

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: StaffRole;
  is_active: boolean | number;
  has_signature?: boolean;
  signature_data?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffUserPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: StaffRole;
}

export interface UpdateStaffUserPayload {
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role?: StaffRole;
  is_active?: boolean;
  signature_data?: string | null;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrators',
  manager: 'Vadītājs',
  technician: 'Meistars',
  viewer: 'Skatītājs',
};

export interface AssignableStaff {
  id: string;
  full_name: string;
  role: StaffRole;
}

export const usersApi = {
  list: () => api.get<{ data: StaffUser[] }>('/users'),

  listAssignable: () => api.get<{ data: AssignableStaff[] }>('/users/assignable'),

  get: (id: string) => api.get<{ data: StaffUser }>(`/users/${id}`),

  create: (data: CreateStaffUserPayload) =>
    api.post<{ data: StaffUser }>('/users', data),

  update: (id: string, data: UpdateStaffUserPayload) =>
    api.put<{ data: StaffUser }>(`/users/${id}`, data),
};
