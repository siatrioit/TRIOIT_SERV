export type UnitActivityAction = 'created' | 'updated' | 'status_changed' | 'incident_sync' | 'linked_to_parent' | 'moved_to_parent' | 'unlinked_from_parent' | 'deleted';
export interface UnitActivityEntry {
    id: string;
    unit_id: string;
    action: UnitActivityAction;
    description: string;
    actor_user_id: string | null;
    actor_name: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}
export type UnitActor = {
    userId: string;
    userName: string;
};
export declare function resolveStaffActorName(userId: string): Promise<string>;
export declare function logUnitActivity(unitId: string, action: UnitActivityAction, description: string, actor?: UnitActor | null, metadata?: Record<string, unknown> | null): Promise<void>;
export declare function listUnitActivity(unitId: string): Promise<UnitActivityEntry[]>;
//# sourceMappingURL=unitActivity.d.ts.map