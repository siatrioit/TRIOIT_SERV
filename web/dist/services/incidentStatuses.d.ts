export type IncidentStatusCategory = 'open' | 'closed';
export type UnitStatusCode = 'active' | 'repair' | 'decommissioned' | 'spare';
export interface IncidentStatusRow {
    id: string;
    code: string;
    label: string;
    category: IncidentStatusCategory;
    sort_order: number;
    badge_tone: string | null;
    sync_unit_status: UnitStatusCode | null;
    is_active: number | boolean;
    created_at: string;
    updated_at: string;
}
export declare function invalidateIncidentStatusCache(): void;
export declare function listIncidentStatuses(activeOnly?: boolean): Promise<IncidentStatusRow[]>;
export declare function getOpenStatusCodes(): Promise<string[]>;
export declare function getClosedStatusCodes(): Promise<string[]>;
export declare function assertValidIncidentStatus(code: string): Promise<IncidentStatusRow>;
export declare function getDefaultIncidentStatusCode(): Promise<string>;
export declare function isClosedIncidentStatus(code: string): Promise<boolean>;
export declare function createIncidentStatus(input: {
    label: string;
    code?: string;
    category?: IncidentStatusCategory;
    sort_order?: number;
    badge_tone?: string | null;
    sync_unit_status?: UnitStatusCode | null;
}): Promise<IncidentStatusRow>;
export declare function updateIncidentStatus(id: string, input: {
    label?: string;
    category?: IncidentStatusCategory;
    sort_order?: number;
    badge_tone?: string | null;
    sync_unit_status?: UnitStatusCode | null;
    is_active?: boolean;
}): Promise<IncidentStatusRow | null>;
export declare function deleteIncidentStatus(id: string): Promise<void>;
export declare function statusByCode(rows: IncidentStatusRow[]): Map<string, IncidentStatusRow>;
export declare function sqlInActiveStatusCodes(category?: 'open' | 'closed'): Promise<{
    fragment: string;
    codes: string[];
}>;
//# sourceMappingURL=incidentStatuses.d.ts.map