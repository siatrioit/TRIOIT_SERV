import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export type ValidationDetail = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: ValidationDetail[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get displayMessage(): string {
    if (!this.details?.length) return this.message;
    const fields = this.details.map((d) => d.field).join(', ');
    return `${this.message} (${fields})`;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 503) {
      throw new ApiError(503, 'Serveris īslaicīgi nav pieejams. cPanel → Node.js → Restart.');
    }
    throw new ApiError(response.status, 'Servera kļūda — API neatbild');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (body.error as string) || 'Request failed',
      body.code as string | undefined,
      body.details as ValidationDetail[] | undefined
    );
  }

  return body as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
};
