import { api } from './client';

export interface IncidentMessage {
  id: string;
  incident_id: string;
  author_type: 'staff' | 'portal';
  author_name: string;
  body: string;
  created_at: string;
}

export const incidentMessagesApi = {
  list: (incidentId: string) =>
    api.get<{ data: IncidentMessage[] }>(`/incidents/${incidentId}/messages`),

  send: (incidentId: string, body: string) =>
    api.post<{ data: IncidentMessage }>(`/incidents/${incidentId}/messages`, { body }),

  markRead: (incidentId: string) =>
    api.post<{ success: boolean }>(`/incidents/${incidentId}/messages/read`),
};
