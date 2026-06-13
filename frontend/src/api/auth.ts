import { api } from './client';

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  has_signature?: boolean;
  signature_data?: string | null;
};

export const authApi = {
  me: () => api.get<{ data: AuthUser }>('/auth/me'),

  updateSignature: (signature_data: string | null) =>
    api.put<{ success: boolean }>('/auth/me/signature', { signature_data }),
};
