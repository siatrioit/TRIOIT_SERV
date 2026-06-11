import { api } from './client';

export type WorkType = 'diagnostika' | 'remonts' | 'uzstadisana' | 'demontaza' | 'cits';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  diagnostika: 'Diagnostika',
  remonts: 'Remonts',
  uzstadisana: 'Uzstādīšana',
  demontaza: 'Demontāža',
  cits: 'Cits',
};

export interface IncidentWorkLog {
  id: string;
  incident_id: string;
  user_id?: string;
  work_date: string;
  duration_minutes: number;
  description: string;
  work_type?: string;
  created_at: string;
  user_name?: string;
}

export interface IncidentMaterial {
  id: string;
  incident_id: string;
  warehouse_item_id: string;
  quantity: number;
  notes?: string;
  used_at: string;
  used_by?: string;
  created_at: string;
  item_name?: string;
  item_unit?: string;
  item_sku?: string;
  used_by_name?: string;
}

export const incidentWorkApi = {
  listWorkLogs: (incidentId: string) =>
    api.get<{ data: IncidentWorkLog[] }>(`/incidents/${incidentId}/work-logs`),

  addWorkLog: (
    incidentId: string,
    data: {
      work_date: string;
      duration_minutes: number;
      description: string;
      work_type?: string;
    }
  ) => api.post<{ data: IncidentWorkLog }>(`/incidents/${incidentId}/work-logs`, data),

  deleteWorkLog: (incidentId: string, workLogId: string) =>
    api.delete<{ success: boolean }>(`/incidents/${incidentId}/work-logs/${workLogId}`),

  listMaterials: (incidentId: string) =>
    api.get<{ data: IncidentMaterial[] }>(`/incidents/${incidentId}/materials`),

  addMaterial: (
    incidentId: string,
    data: { warehouse_item_id: string; quantity: number; notes?: string }
  ) => api.post<{ data: IncidentMaterial }>(`/incidents/${incidentId}/materials`, data),

  deleteMaterial: (incidentId: string, materialId: string) =>
    api.delete<{ success: boolean }>(`/incidents/${incidentId}/materials/${materialId}`),
};

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
