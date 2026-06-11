import { api } from './client';

export interface Incident {
  id: string;
  incident_number: string;
  client_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  received_at: string;
  due_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const incidentsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return api.get<PaginatedResponse<Incident>>(`/incidents${query}`);
  },

  get: (id: string) =>
    api.get<{ data: Incident }>(`/incidents/${id}`),

  create: (data: Partial<Incident>) =>
    api.post<{ data: Incident }>('/incidents', data),

  updateStatus: (id: string, status: string, resolution?: string) =>
    api.patch<{ data: Incident }>(`/incidents/${id}/status`, { status, resolution }),
};
