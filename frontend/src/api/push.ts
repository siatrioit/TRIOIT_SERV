import { api } from './client';

export type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export const pushApi = {
  getConfig: async (): Promise<PushConfig> => {
    const res = await api.get<{ data: PushConfig }>('/push/config');
    return res.data;
  },

  subscribe: (data: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => api.post<{ success: boolean }>('/push/subscribe', data),

  unsubscribe: (data: { endpoint: string }) =>
    api.delete<{ success: boolean }>('/push/subscribe', data),
};
