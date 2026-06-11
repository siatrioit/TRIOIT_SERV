import { api } from './client';

export type ClientType = 'company' | 'private';

export type ObjectStatus = 'active' | 'closed';

export interface ClientObjectInput {
  id?: string;
  status?: ObjectStatus;
  incident_count?: number;
  name: string;
  object_code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  access_notes?: string;
  notes?: string;
  is_primary?: boolean;
}

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  registration_number?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  representative?: string;
  notes?: string;
  object_count?: number;
  objects?: ClientObjectInput[];
  closed_objects?: ClientObjectInput[];
}

export interface ClientPayload {
  name: string;
  client_type: ClientType;
  registration_number?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  representative?: string;
  notes?: string;
  objects?: ClientObjectInput[];
}

export const clientsApi = {
  list: (params?: { search?: string; page?: string; limit?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', params.page);
    if (params?.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return api.get<{ data: Client[] }>(`/clients${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    api.get<{ data: Client }>(`/clients/${id}`),

  create: (data: ClientPayload) =>
    api.post<{ data: Client }>('/clients', data),

  update: (id: string, data: Partial<ClientPayload>) =>
    api.put<{ data: Client }>(`/clients/${id}`, data),

  createObject: (clientId: string, data: ClientObjectInput) =>
    api.post<{ data: ClientObjectInput & { id: string } }>(
      `/clients/${clientId}/objects`,
      sanitizeClientObject(data)
    ),

  updateObject: (clientId: string, objectId: string, data: ClientObjectInput) =>
    api.put<{ data: ClientObjectInput & { id: string } }>(
      `/clients/${clientId}/objects/${objectId}`,
      sanitizeClientObject(data)
    ),

  deleteObject: (clientId: string, objectId: string) =>
    api.delete<{ success: boolean }>(`/clients/${clientId}/objects/${objectId}`, {
      confirm: 'DELETE',
    }),

  closeObject: (clientId: string, objectId: string) =>
    api.post<{ data: ClientObjectInput & { id: string } }>(
      `/clients/${clientId}/objects/${objectId}/close`
    ),

  reopenObject: (clientId: string, objectId: string) =>
    api.post<{ data: ClientObjectInput & { id: string } }>(
      `/clients/${clientId}/objects/${objectId}/reopen`
    ),
};

/** Tīrs API payload — bez DB papildlaukiem un tukšām virknēm */
export function sanitizeClientObject(o: ClientObjectInput): ClientObjectInput {
  const trim = (s?: string) => {
    const t = s?.trim();
    return t || undefined;
  };
  return {
    id: o.id,
    name: o.name.trim(),
    object_code: trim(o.object_code),
    address: trim(o.address),
    city: trim(o.city),
    postal_code: trim(o.postal_code),
    country: o.country || 'LV',
    contact_name: trim(o.contact_name),
    contact_phone: trim(o.contact_phone),
    contact_email: trim(o.contact_email),
    access_notes: trim(o.access_notes),
    notes: trim(o.notes),
    is_primary: Boolean(o.is_primary),
  };
}

export function emptyObject(isPrimary = false): ClientObjectInput {
  return {
    name: '',
    object_code: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'LV',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    access_notes: '',
    notes: '',
    is_primary: isPrimary,
  };
}
