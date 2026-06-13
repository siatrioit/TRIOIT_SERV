import { api } from './client';

export function isProductService(product?: { is_service?: unknown } | null): boolean {
  const v = product?.is_service;
  return v === true || v === 1 || v === '1';
}

export interface WarehouseProductGroup {
  id: string;
  name: string;
  parent_id?: string | null;
  parent_name?: string | null;
  sort_order: number;
  product_count?: number;
}

export interface WarehouseProduct {
  id: string;
  group_id?: string | null;
  group_name?: string | null;
  subgroup_name?: string | null;
  group_path?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  quantity_on_hand: number;
  min_quantity?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  is_service?: boolean | number;
}

export interface WarehouseProductMovement {
  id: string;
  product_id: string;
  product_name?: string;
  product_unit?: string | null;
  is_service?: boolean | number;
  movement_type: 'in' | 'out' | 'adjust';
  quantity: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface WaybillLine {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  product_unit?: string | null;
  quantity: number;
  unit_price?: number | null;
}

export interface WarehouseReceipt {
  id: string;
  document_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_registration_number?: string | null;
  supplier_vat_number?: string | null;
  supplier_address?: string | null;
  supplier_document_number?: string | null;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  operation_description?: string | null;
  notes?: string | null;
  lines?: WaybillLine[];
}

export interface WarehouseIssue {
  id: string;
  document_number: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_registration_number?: string | null;
  buyer_vat_number?: string | null;
  buyer_address?: string | null;
  buyer_document_number?: string | null;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  operation_description?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  lines?: WaybillLine[];
}

export const warehouseCommercialApi = {
  listGroups: () => api.get<{ data: WarehouseProductGroup[] }>('/warehouse/groups'),
  createGroup: (data: { name: string; parent_id?: string | null; sort_order?: number }) =>
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

  listProductMovements: (params?: { product_id?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.product_id) q.set('product_id', params.product_id);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<{ data: WarehouseProductMovement[] }>(
      `/warehouse/journal/movements${qs ? `?${qs}` : ''}`
    );
  },

  listReceipts: () => api.get<{ data: WarehouseReceipt[] }>('/warehouse/receipts'),
  getReceipt: (id: string) => api.get<{ data: WarehouseReceipt }>(`/warehouse/receipts/${id}`),
  createReceipt: (data: {
    supplier_id: string;
    supplier_document_number?: string;
    document_date: string;
    operation_description?: string;
    notes?: string;
    lines: { product_id: string; quantity: number; unit_price?: number | null }[];
  }) => api.post<{ data: WarehouseReceipt }>('/warehouse/receipts', data),
  postReceipt: (id: string) => api.post<{ data: WarehouseReceipt }>(`/warehouse/receipts/${id}/post`),

  listIssues: () => api.get<{ data: WarehouseIssue[] }>('/warehouse/issues'),
  getIssue: (id: string) => api.get<{ data: WarehouseIssue }>(`/warehouse/issues/${id}`),
  createIssue: (data: {
    buyer_id: string;
    buyer_document_number?: string;
    document_date: string;
    operation_description?: string;
    delivery_address?: string;
    notes?: string;
    lines: { product_id: string; quantity: number; unit_price?: number | null }[];
  }) => api.post<{ data: WarehouseIssue }>('/warehouse/issues', data),
  postIssue: (id: string) => api.post<{ data: WarehouseIssue }>(`/warehouse/issues/${id}/post`),
};
