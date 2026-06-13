import { api } from './client';

export type UnitType = string;
export type UnitStatus = 'active' | 'repair' | 'decommissioned' | 'spare';

export interface Unit {
  id: string;
  client_id: string;
  object_id?: string | null;
  unit_type: UnitType;
  asset_type_id?: string | null;
  asset_component_id?: string | null;
  asset_type_name?: string | null;
  asset_component_name?: string | null;
  serial_number: string;
  model?: string | null;
  manufacturer?: string | null;
  status: UnitStatus;
  location_note?: string | null;
  installed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  object_name?: string | null;
}

export interface UnitInput {
  asset_type_id?: string;
  unit_type?: UnitType;
  asset_component_id?: string | null;
  serial_number: string;
  model?: string;
  manufacturer?: string;
  status?: UnitStatus;
  location_note?: string;
  installed_at?: string;
  notes?: string;
}

/** Atpakaļsaderība — ja API vēl nav ielādējis tipus no DB */
export const UNIT_TYPE_LABELS: Record<string, string> = {
  computer: 'Dators',
  pos: 'POS kase',
  printer: 'Printeris',
  network: 'Tīkla iekārta',
  other: 'Cits',
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  active: 'Aktīva',
  repair: 'Remontā',
  decommissioned: 'Izņemta',
  spare: 'Rezerve',
};

export function unitDisplayLabel(
  unit: Pick<Unit, 'unit_type' | 'serial_number' | 'model' | 'asset_type_name' | 'asset_component_name'>
): string {
  const type = unit.asset_type_name || UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type;
  const component = unit.asset_component_name ? ` · ${unit.asset_component_name}` : '';
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model}${component} · ${unit.serial_number}`;
}

export const unitsApi = {
  list: (params?: { search?: string; client_id?: string; object_id?: string; limit?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.client_id) q.set('client_id', params.client_id);
    if (params?.object_id) q.set('object_id', params.object_id);
    if (params?.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return api.get<{ data: Unit[] }>(`/units${qs ? `?${qs}` : ''}`);
  },

  listForObject: (clientId: string, objectId: string) =>
    api.get<{ data: Unit[] }>(`/clients/${clientId}/objects/${objectId}/units`),

  createForObject: (clientId: string, objectId: string, data: UnitInput) =>
    api.post<{ data: Unit }>(`/clients/${clientId}/objects/${objectId}/units`, data),

  updateForObject: (clientId: string, objectId: string, unitId: string, data: Partial<UnitInput>) =>
    api.put<{ data: Unit }>(`/clients/${clientId}/objects/${objectId}/units/${unitId}`, data),

  deleteForObject: (clientId: string, objectId: string, unitId: string) =>
    api.delete<{ success: boolean }>(
      `/clients/${clientId}/objects/${objectId}/units/${unitId}`
    ),

  update: (unitId: string, data: Partial<UnitInput>) =>
    api.put<{ data: Unit }>(`/units/${unitId}`, data),

  delete: (unitId: string) => api.delete<{ success: boolean }>(`/units/${unitId}`),
};
