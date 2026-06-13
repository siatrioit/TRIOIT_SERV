import { api } from './client';

export type IncidentStatusCategory = 'open' | 'closed';
export type UnitStatusCode = 'active' | 'repair' | 'decommissioned' | 'spare';

export interface IncidentStatusConfig {
  id: string;
  code: string;
  label: string;
  category: IncidentStatusCategory;
  sort_order: number;
  badge_tone: string | null;
  sync_unit_status: UnitStatusCode | null;
  sync_activity_label?: string | null;
  is_active?: boolean | number;
}

export const SYNC_UNIT_OPTIONS: { value: UnitStatusCode; label: string }[] = [
  { value: 'repair', label: 'Remontā' },
  { value: 'active', label: 'Aktīva' },
  { value: 'decommissioned', label: 'Izņemta' },
  { value: 'spare', label: 'Rezerve' },
];

export const BADGE_TONE_OPTIONS = [
  { value: 'yellow', label: 'Dzeltena' },
  { value: 'blue', label: 'Zila' },
  { value: 'gray', label: 'Pelēka' },
  { value: 'green', label: 'Zaļa' },
  { value: 'red', label: 'Sarkana' },
  { value: 'orange', label: 'Oranža' },
];

export const incidentStatusesApi = {
  list: () => api.get<{ data: IncidentStatusConfig[] }>('/incident-statuses'),
  listAdmin: () => api.get<{ data: IncidentStatusConfig[] }>('/setup/incident-statuses'),
  create: (data: {
    label: string;
    code?: string;
    category?: IncidentStatusCategory;
    sort_order?: number;
    badge_tone?: string | null;
    sync_unit_status?: UnitStatusCode | null;
    sync_activity_label?: string | null;
  }) => api.post<{ data: IncidentStatusConfig }>('/setup/incident-statuses', data),
  update: (
    id: string,
    data: Partial<{
      label: string;
      category: IncidentStatusCategory;
      sort_order: number;
      badge_tone: string | null;
      sync_unit_status: UnitStatusCode | null;
      sync_activity_label: string | null;
      is_active: boolean;
    }>
  ) => api.put<{ data: IncidentStatusConfig }>(`/setup/incident-statuses/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/setup/incident-statuses/${id}`),
};
