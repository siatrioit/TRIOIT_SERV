import { api } from './client';

export type ClientType = 'company' | 'private';

export interface ClientObjectInput {
  id?: string;
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
}

export interface ClientPayload {
  name: string;
  client_type: ClientType;
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
};

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
