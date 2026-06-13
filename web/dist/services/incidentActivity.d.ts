export type IncidentActivityAction = 'created' | 'status_changed' | 'assigned';
export interface IncidentActivityEntry {
    id: string;
    incident_id: string;
    action: IncidentActivityAction;
    description: string;
    actor_user_id: string | null;
    actor_name: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}
export type IncidentActor = {
    userId: string;
    userName: string;
};
export declare function logIncidentActivity(incidentId: string, action: IncidentActivityAction, description: string, actor?: IncidentActor | null, metadata?: Record<string, unknown> | null): Promise<void>;
export declare function logIncidentCreated(incidentId: string, statusCode: string, actor?: IncidentActor | null): Promise<void>;
export declare function logIncidentStatusChanged(incidentId: string, fromStatus: string, toStatus: string, actor?: IncidentActor | null, resolution?: string | null): Promise<void>;
export declare function logIncidentAssigned(incidentId: string, assigneeName: string, actor?: IncidentActor | null): Promise<void>;
export declare function listIncidentActivity(incidentId: string): Promise<IncidentActivityEntry[]>;
//# sourceMappingURL=incidentActivity.d.ts.map