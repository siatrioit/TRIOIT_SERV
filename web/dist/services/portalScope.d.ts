export type PortalAccessGrant = {
    id: string;
    client_id: string;
    object_id: string | null;
    scope: 'client' | 'object';
    client_name: string;
    object_name?: string | null;
};
export type PortalObject = {
    id: string;
    client_id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    object_code?: string | null;
    status: string;
};
export declare function getPortalUserAccess(portalUserId: string): Promise<PortalAccessGrant[]>;
/** SQL nosacījums — kuri atgadījumi redzami portāla lietotājam */
export declare function buildIncidentScopeClause(grants: PortalAccessGrant[]): {
    clause: string;
    params: unknown[];
};
export declare function assertCanViewIncident(grants: PortalAccessGrant[], incidentId: string): Promise<void>;
export declare function assertCanCreateIncident(grants: PortalAccessGrant[], clientId: string, objectId: string): Promise<void>;
export declare function assertCanAccessObject(grants: PortalAccessGrant[], objectId: string): Promise<void>;
export declare function listAccessibleObjects(grants: PortalAccessGrant[]): Promise<PortalObject[]>;
//# sourceMappingURL=portalScope.d.ts.map