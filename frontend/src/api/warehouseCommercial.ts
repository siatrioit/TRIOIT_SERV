import { api } from './client';

export interface WarehouseProductGroup {
  id: string;
  name: string;
  sort_order: number;
  product_count?: number;
}

export interface WarehouseProduct {
  id: string;
  group_id?: string | null;
  group_name?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  quantity_on_hand: number;
  min_quantity?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
}

export interface WaybillLine {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  quantity: number;
  unit_price?: number | null;
}

export interface WarehouseReceipt {
  id: string;
  document_number: string;
  supplier_id: string;
  supplier_name?: string;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string | null;
  lines?: WaybillLine[];
}

export interface WarehouseIssue {
  id: string;
  document_number: string;
  buyer_id: string;
  buyer_name?: string;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string | null;
  lines?: WaybillLine[];
}

export const warehouseCommercialApi = {
  listGroups: () => api.get<{ data: WarehouseProductGroup[] }>('/warehouse/groups'),
  createGroup: (data: { name: string; sort_order?: number }) =>
    api.post<{ data: WarehouseProductGroup }>('/warehouse/groups', data),
  updateGroup: (id: string, data: { name?: string; sort_order?: number }) =>
    api.put<{ data: WarehouseProductGroup }>(`/warehouse/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete<{ success: boolean }>(`/warehouse/groups/${id}`),

  listProducts: (params?: { search?: string; group_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.group_id) q.set('group_id', params.group_id);
    const qs = q.toString();
    return api.get<{ data: WarehouseProduct[] }>(`/warehouse/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (data: Partial<WarehouseProduct>) =>
    api.post<{ data: WarehouseProduct }>('/warehouse/products', data),
  updateProduct: (id: string, data: Partial<WarehouseProduct>) =>
    api.put<{ data: WarehouseProduct }>(`/warehouse/products/${id}`, data),
  deleteProduct: (id: string) => api.delete<{ success: boolean }>(`/warehouse/products/${id}`),

  listReceipts: () => api.get<{ data: WarehouseReceipt[] }>('/warehouse/receipts'),
  getReceipt: (id: string) => api.get<{ data: WarehouseReceipt }>(`/warehouse/receipts/${id}`),
  createReceipt: (data: {
    supplier_id: string;
    document_date: string;
    notes?: string;
    lines: { product_id: string; quantity: number; unit_price?: number | null }[];
  }) => api.post<{ data: WarehouseReceipt }>('/warehouse/receipts', data),
  postReceipt: (id: string) => api.post<{ data: WarehouseReceipt }>(`/warehouse/receipts/${id}/post`),

  listIssues: () => api.get<{ data: WarehouseIssue[] }>('/warehouse/issues'),
  getIssue: (id: string) => api.get<{ data: WarehouseIssue }>(`/warehouse/issues/${id}`),
  createIssue: (data: {
    buyer_id: string;
    document_date: string;
    notes?: string;
    lines: { product_id: string; quantity: number; unit_price?: number | null }[];
  }) => api.post<{ data: WarehouseIssue }>('/warehouse/issues', data),
  postIssue: (id: string) => api.post<{ data: WarehouseIssue }>(`/warehouse/issues/${id}/post`),
};
