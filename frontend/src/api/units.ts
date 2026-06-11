import { api } from './client';

export type UnitType = 'computer' | 'pos' | 'printer' | 'network' | 'other';
export type UnitStatus = 'active' | 'repair' | 'decommissioned' | 'spare';

export interface Unit {
  id: string;
  client_id: string;
  object_id?: string | null;
  unit_type: UnitType;
  serial_number: string;
  model?: string | null;
  manufacturer?: string | null;
  status: UnitStatus;
  location_note?: string | null;
  installed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitInput {
  unit_type: UnitType;
  serial_number: string;
  model?: string;
  manufacturer?: string;
  status?: UnitStatus;
  location_note?: string;
  installed_at?: string;
  notes?: string;
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
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

export function unitDisplayLabel(unit: Pick<Unit, 'unit_type' | 'serial_number' | 'model'>): string {
  const type = UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type;
  const model = unit.model ? ` ${unit.model}` : '';
  return `${type}${model} · ${unit.serial_number}`;
}

export const unitsApi = {
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
};
