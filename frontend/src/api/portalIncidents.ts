import { portalApi } from './portalClient';
import type { IncidentMessage } from './incidentMessages';
import type { CompletionAct, SignCompletionPayload } from './incidentCompletion';

export interface PortalIncident {
  id: string;
  incident_number: string;
  client_id: string;
  object_id: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  received_at: string;
  completed_at?: string | null;
  resolution?: string | null;
  client_name: string;
  object_name?: string | null;
  unit_id?: string | null;
  unit_serial?: string | null;
  unit_type?: string | null;
  unit_model?: string | null;
  asset_component_name?: string | null;
  unread_count?: number;
}

export interface CreatePortalIncidentPayload {
  client_id: string;
  object_id: string;
  unit_id?: string;
  asset_component_id?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export const portalIncidentsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return portalApi.get<{
      data: PortalIncident[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/incidents${query}`);
  },

  get: (id: string) => portalApi.get<{ data: PortalIncident }>(`/incidents/${id}`),

  create: (data: CreatePortalIncidentPayload) =>
    portalApi.post<{ data: PortalIncident }>('/incidents', data),

  listMessages: (incidentId: string) =>
    portalApi.get<{ data: IncidentMessage[] }>(`/incidents/${incidentId}/messages`),

  sendMessage: (incidentId: string, body: string) =>
    portalApi.post<{ data: IncidentMessage }>(`/incidents/${incidentId}/messages`, { body }),

  markRead: (incidentId: string) =>
    portalApi.post<{ success: boolean }>(`/incidents/${incidentId}/read`),

  getCompletion: (incidentId: string) =>
    portalApi.get<{ data: CompletionAct | null }>(`/incidents/${incidentId}/completion`),

  signCompletion: (incidentId: string, payload: SignCompletionPayload) =>
    portalApi.post<{ data: CompletionAct }>(`/incidents/${incidentId}/completion/sign`, payload),
};
