import { api } from './client';

export interface WarehouseItem {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  unit: string;
  quantity_on_hand: number;
  min_quantity?: number;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseItemInput {
  sku?: string;
  name: string;
  description?: string;
  unit?: string;
  min_quantity?: number;
}

export interface WarehouseMovement {
  id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjust';
  quantity: number;
  quantity_after: number;
  notes?: string;
  created_at: string;
}

export const warehouseApi = {
  list: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<{ data: WarehouseItem[] }>(`/warehouse${q}`);
  },

  create: (data: WarehouseItemInput) =>
    api.post<{ data: WarehouseItem }>('/warehouse', data),

  update: (id: string, data: Partial<WarehouseItemInput>) =>
    api.put<{ data: WarehouseItem }>(`/warehouse/${id}`, data),

  stockIn: (id: string, data: { quantity: number; notes?: string }) =>
    api.post<{ data: WarehouseItem }>(`/warehouse/${id}/stock-in`, data),

  movements: (id: string) =>
    api.get<{ data: WarehouseMovement[] }>(`/warehouse/${id}/movements`),
};
