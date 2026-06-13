import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export type CompletionAct = {
  id: string;
  incident_id: string;
  staff_requested_at: string | null;
  staff_requested_by: string | null;
  client_signer_name: string | null;
  signature_type: 'typed' | 'drawn';
  client_signed_at: string | null;
  act_number: string | null;
  act_generated_at: string | null;
  has_signature: boolean;
  has_act: boolean;
  staff_requested_by_name?: string | null;
};

export type SignCompletionPayload = {
  signer_name: string;
  signature_type: 'typed' | 'drawn';
  signature_data: string;
};

async function staffRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Pieprasījums neizdevās');
  }
  return response.json() as Promise<T>;
}

export const incidentCompletionApi = {
  get: (incidentId: string) =>
    staffRequest<{ data: CompletionAct | null }>(`/incidents/${incidentId}/completion`),

  request: (incidentId: string) =>
    staffRequest<{ data: CompletionAct }>(`/incidents/${incidentId}/completion/request`, {
      method: 'POST',
    }),

  sign: (incidentId: string, payload: SignCompletionPayload) =>
    staffRequest<{ data: CompletionAct }>(`/incidents/${incidentId}/completion/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateAct: (incidentId: string) =>
    staffRequest<{ data: CompletionAct }>(`/incidents/${incidentId}/completion/generate-act`, {
      method: 'POST',
    }),

  downloadAct: async (incidentId: string, filename: string) => {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/completion/act.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Neizdevās lejupielādēt aktu');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
