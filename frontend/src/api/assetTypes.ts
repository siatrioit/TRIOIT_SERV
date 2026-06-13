import { api } from './client';

export interface AssetTypeComponent {
  id: string;
  asset_type_id: string;
  name: string;
  sort_order: number;
  is_active: boolean | number;
}

export interface AssetType {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean | number;
  components?: AssetTypeComponent[];
}

export const assetTypesApi = {
  list: (includeComponents = true) =>
    api.get<{ data: AssetType[] }>(
      `/asset-types${includeComponents ? '?include_components=1' : ''}`
    ),

  listAdmin: () => api.get<{ data: AssetType[] }>('/setup/asset-types'),

  create: (data: { name: string; code?: string; sort_order?: number }) =>
    api.post<{ data: AssetType }>('/setup/asset-types', data),

  update: (id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>) =>
    api.put<{ data: AssetType }>(`/setup/asset-types/${id}`, data),

  delete: (id: string) => api.delete<{ success: boolean }>(`/setup/asset-types/${id}`),

  createComponent: (typeId: string, data: { name: string; sort_order?: number }) =>
    api.post<{ data: AssetTypeComponent }>(`/setup/asset-types/${typeId}/components`, data),

  updateComponent: (
    componentId: string,
    data: Partial<{ name: string; sort_order: number; is_active: boolean }>
  ) =>
    api.put<{ data: AssetTypeComponent }>(`/setup/asset-types/components/${componentId}`, data),

  deleteComponent: (componentId: string) =>
    api.delete<{ success: boolean }>(`/setup/asset-types/components/${componentId}`),
};
