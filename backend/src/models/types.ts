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
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
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
  unit_type: UnitType;
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
