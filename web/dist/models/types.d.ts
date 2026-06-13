/** Kopīgie tipi visām entītijām */
export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';
export type ClientType = 'company' | 'private';
export type ContractStatus = 'active' | 'expired' | 'renewable' | 'draft' | 'cancelled';
export type UnitType = 'computer' | 'pos' | 'printer' | 'network' | 'other';
export type UnitStatus = 'active' | 'repair' | 'decommissioned' | 'spare';
export type ServiceCoverage = 'contract' | 'extra';
export type IncidentStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'confirmed' | 'paid' | 'overdue' | 'cancelled';
export interface Client {
    id: string;
    name: string;
    client_type: ClientType;
    registration_number?: string;
    vat_number?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    representative?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    objects?: ClientObject[];
}
/** Apkalpojamais objekts (veikals, birojs, noliktava u.c.) */
export interface ClientObject {
    id: string;
    client_id: string;
    name: string;
    object_code?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    access_notes?: string;
    notes?: string;
    is_primary: boolean | number;
    assigned_user_id?: string | null;
    assigned_user_name?: string | null;
    status: 'active' | 'closed';
    is_active: boolean | number;
    incident_count?: number;
    created_at: string;
    updated_at: string;
}
export type PortalScope = 'client' | 'object';
export interface PortalUser {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    is_active: boolean | number;
    created_at: string;
    updated_at: string;
}
export interface PortalAccess {
    id: string;
    portal_user_id: string;
    client_id: string;
    object_id?: string | null;
    scope: PortalScope;
    is_active: boolean | number;
    created_at: string;
    email?: string;
    full_name?: string;
    phone?: string | null;
    user_active?: boolean | number;
    object_name?: string | null;
}
export interface Contract {
    id: string;
    client_id: string;
    contract_number: string;
    title: string;
    start_date: string;
    end_date?: string;
    status: ContractStatus;
    monthly_fee?: number;
    terms?: string;
    notes?: string;
    document_url?: string;
    created_at: string;
    updated_at: string;
}
export interface Unit {
    id: string;
    client_id: string;
    object_id?: string;
    contract_id?: string;
    unit_type: UnitType | string;
    asset_type_id?: string | null;
    asset_component_id?: string | null;
    parent_unit_id?: string | null;
    asset_type_name?: string | null;
    asset_component_name?: string | null;
    parent_serial_number?: string | null;
    serial_number: string;
    model?: string;
    manufacturer?: string;
    status: UnitStatus;
    location_note?: string;
    installed_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface Service {
    id: string;
    code: string;
    name: string;
    description?: string;
    coverage_type: ServiceCoverage;
    base_price: number;
    transport_price: number;
    unit: string;
    is_active: boolean;
}
export interface Incident {
    id: string;
    incident_number: string;
    client_id: string;
    object_id?: string;
    unit_id?: string;
    asset_component_id?: string | null;
    asset_component_name?: string | null;
    contract_id?: string;
    reported_by?: string;
    reported_via?: string;
    title: string;
    description?: string;
    status: IncidentStatus;
    priority: IncidentPriority;
    received_at: string;
    due_at?: string;
    completed_at?: string;
    resolution?: string;
    assigned_to?: string;
    assigned_user_name?: string | null;
    latitude?: number;
    longitude?: number;
    voice_transcript?: string;
    ai_confidence?: number;
    ai_metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface Invoice {
    id: string;
    invoice_number: string;
    client_id: string;
    incident_id?: string;
    contract_id?: string;
    status: InvoiceStatus;
    issue_date?: string;
    due_date?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    currency: string;
    notes?: string;
    document_url?: string;
    sent_at?: string;
    paid_at?: string;
    created_at: string;
    updated_at: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface WarehouseItem {
    id: string;
    sku?: string;
    name: string;
    description?: string;
    unit: string;
    quantity_on_hand: number;
    min_quantity?: number;
    is_active: boolean | number;
    created_at: string;
    updated_at: string;
}
export interface WarehouseMovement {
    id: string;
    item_id: string;
    movement_type: 'in' | 'out' | 'adjust';
    quantity: number;
    quantity_after: number;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
    created_at: string;
}
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
//# sourceMappingURL=types.d.ts.map