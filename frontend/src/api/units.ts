import { api } from './client';

export type UnitType = string;
export type UnitStatus = 'active' | 'repair' | 'decommissioned' | 'spare';

export interface Unit {
  id: string;
  client_id: string;
  object_id?: string | null;
  parent_unit_id?: string | null;
  unit_type: UnitType;
  asset_type_id?: string | null;
  asset_component_id?: string | null;
  asset_type_name?: string | null;
  asset_component_name?: string | null;
  parent_serial_number?: string | null;
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
  parent_unit_id?: string | null;
  serial_number: string;
  model?: string;
  manufacturer?: string;
  status?: UnitStatus;
  location_note?: string;
  installed_at?: string;
  notes?: string;
}

export interface UnitActivityEntry {
  id: string;
  unit_id: string;
  action: string;
  description: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  created_at: string;
}

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
  unit: Pick<Unit, 'unit_type' | 'serial_number' | 'model' | 'asset_type_name' | 'asset_component_name' | 'parent_unit_id'>
): string {
  if (unit.parent_unit_id) {
    const section = unit.asset_component_name || 'Apakšaktīvs';
    const model = unit.model ? ` ${unit.model}` : '';
    return `${section}${model} · ${unit.serial_number}`;
  }
  const type = unit.asset_type_name || UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type;
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model} · ${unit.serial_number}`;
}

export function isSubUnit(unit: Pick<Unit, 'parent_unit_id'>): boolean {
  return Boolean(unit.parent_unit_id);
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

  listActivityForObject: (clientId: string, objectId: string, unitId: string) =>
    api.get<{ data: UnitActivityEntry[] }>(
      `/clients/${clientId}/objects/${objectId}/units/${unitId}/activity`
    ),

  listActivity: (unitId: string) =>
    api.get<{ data: UnitActivityEntry[] }>(`/units/${unitId}/activity`),

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
