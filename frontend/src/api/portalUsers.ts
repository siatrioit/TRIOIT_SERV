import { api } from './client';

export type PortalRole = 'viewer' | 'operator' | 'manager';

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  viewer: 'Skatītājs',
  operator: 'Operators',
  manager: 'Vadītājs',
};

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
  phone?: string | null;
  is_active: boolean | number;
  created_at: string;
  access: PortalUserAccessSummary[];
};

export const portalUsersApi = {
  list: () => api.get<{ data: PortalUserAdmin[] }>('/portal-users'),

  get: (id: string) => api.get<{ data: PortalUserAdmin }>(`/portal-users/${id}`),

  update: (
    id: string,
    data: {
      email?: string;
      full_name?: string;
      phone?: string | null;
      is_active?: boolean;
    }
  ) => api.put<{ data: PortalUserAdmin }>(`/portal-users/${id}`, data),

  resetPassword: (id: string, password?: string) =>
    api.post<{ data: { password: string } }>(`/portal-users/${id}/reset-password`, {
      ...(password ? { password } : {}),
    }),

  updateAccessRole: (accessId: string, portal_role: PortalRole) =>
    api.patch<{ success: boolean }>(`/portal-users/access/${accessId}/role`, { portal_role }),
};
