import type { PortalAccessGrant } from './portalScope';
export type PortalRole = 'viewer' | 'operator' | 'manager';
export declare const PORTAL_ROLE_LABELS: Record<PortalRole, string>;
export declare function normalizePortalRole(role: string | undefined | null): PortalRole;
export declare function isPortalWriterRole(role: PortalRole): boolean;
export declare function portalCanCreateIncident(grants: PortalAccessGrant[], clientId: string, objectId: string): boolean;
export declare function portalCanSendChat(grants: PortalAccessGrant[], clientId: string, objectId?: string | null): boolean;
export declare function assertPortalCanCreateIncident(grants: PortalAccessGrant[], clientId: string, objectId: string): void;
export declare function assertPortalCanSendChat(grants: PortalAccessGrant[], incidentId: string): Promise<void>;
export declare function portalUserCanWrite(grants: PortalAccessGrant[]): boolean;
//# sourceMappingURL=portalPermissions.d.ts.map