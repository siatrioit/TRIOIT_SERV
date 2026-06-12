import { api } from './client';

export type PortalScope = 'client' | 'object';
export type PortalRole = 'viewer' | 'operator' | 'manager';

export interface PortalAccessRow {
  id: string;
  portal_user_id: string;
  client_id: string;
  object_id?: string | null;
  scope: PortalScope;
  portal_role: PortalRole;
  is_active: boolean | number;
  created_at: string;
  email: string;
  full_name: string;
  phone?: string | null;
  user_active: boolean | number;
  object_name?: string | null;
}

export interface CreatePortalAccessPayload {
  email: string;
  full_name: string;
  phone?: string;
  password?: string;
  portal_role?: PortalRole;
}

export const portalAccessApi = {
  listForClient: (clientId: string) =>
    api.get<{ data: PortalAccessRow[] }>(`/clients/${clientId}/portal-access`),

  createForClient: (clientId: string, data: CreatePortalAccessPayload) =>
    api.post<{ data: PortalAccessRow; temporary_password?: string }>(
      `/clients/${clientId}/portal-access`,
      data
    ),

  listForObject: (clientId: string, objectId: string) =>
    api.get<{ data: PortalAccessRow[] }>(
      `/clients/${clientId}/objects/${objectId}/portal-access`
    ),

  createForObject: (clientId: string, objectId: string, data: CreatePortalAccessPayload) =>
    api.post<{ data: PortalAccessRow; temporary_password?: string }>(
      `/clients/${clientId}/objects/${objectId}/portal-access`,
      data
    ),

  revoke: (accessId: string) =>
    api.delete<{ success: boolean }>(`/portal-access/${accessId}`),
};
