import { api } from './client';

export interface VoiceExtraction {
  extraction: {
    client_name?: string;
    client_id?: string;
    serial_number?: string;
    unit_id?: string;
    title: string;
    description: string;
    priority: string;
    confidence: number;
  };
  needs_review: boolean;
  suggested_incident: Record<string, unknown>;
}

export const aiApi = {
  voiceToIncident: (transcript: string) =>
    api.post<{ data: VoiceExtraction }>('/ai/voice-to-incident', { transcript }),

  confirmIncident: (data: Record<string, unknown>) =>
    api.post<{ data: { id: string; incident_number: string } }>('/ai/confirm-incident', data),

  query: (query: string) =>
    api.post<{ data: { answer: string; data?: unknown[] } }>('/ai/query', { query }),
};
