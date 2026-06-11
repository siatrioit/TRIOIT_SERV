import { usePortalAuthStore } from '../store/portalAuthStore';
import { ApiError, type ValidationDetail } from './client';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function portalRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = usePortalAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}/portal${endpoint}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error || 'Request failed',
      body.code,
      body.details as ValidationDetail[] | undefined
    );
  }

  return body;
}

export const portalApi = {
  get: <T>(endpoint: string) => portalRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    portalRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
};
