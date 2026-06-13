export interface AssetTypeRow {
    id: string;
    code: string;
    name: string;
    sort_order: number;
    is_active: number | boolean;
    created_at: string;
    updated_at: string;
}
export interface AssetTypeComponentRow {
    id: string;
    asset_type_id: string;
    name: string;
    sort_order: number;
    is_active: number | boolean;
    created_at: string;
    updated_at: string;
}
export declare function listActiveAssetTypes(withComponents: boolean): Promise<(AssetTypeRow & {
    components?: AssetTypeComponentRow[];
})[]>;
export declare function listAllAssetTypesAdmin(): Promise<(AssetTypeRow & {
    components: AssetTypeComponentRow[];
})[]>;
export declare function getAssetTypeById(id: string): Promise<AssetTypeRow | null>;
export declare function resolveAssetTypeId(assetTypeId: string | undefined, unitTypeCode: string | undefined): Promise<{
    id: string;
    code: string;
    name: string;
}>;
export declare function resolveAssetComponentId(componentId: string | null | undefined, assetTypeId: string): Promise<string | null>;
export declare function createAssetType(input: {
    name: string;
    code?: string;
    sort_order?: number;
}): Promise<AssetTypeRow>;
export declare function updateAssetType(id: string, input: Partial<{
    name: string;
    sort_order: number;
    is_active: boolean;
}>): Promise<AssetTypeRow | null>;
export declare function deleteAssetType(id: string): Promise<void>;
export declare function createAssetTypeComponent(assetTypeId: string, input: {
    name: string;
    sort_order?: number;
}): Promise<AssetTypeComponentRow>;
export declare function updateAssetTypeComponent(id: string, input: Partial<{
    name: string;
    sort_order: number;
    is_active: boolean;
}>): Promise<AssetTypeComponentRow | null>;
export declare function deleteAssetTypeComponent(id: string): Promise<void>;
//# sourceMappingURL=assetTypes.d.ts.map