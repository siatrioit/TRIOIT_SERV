import type { PortalRole } from './portalPermissions';
export type PortalUserAccessSummary = {
    id: string;
    client_id: string;
    client_name: string;
    object_id: string | null;
    object_name: string | null;
    scope: 'client' | 'object';
    portal_role: PortalRole;
};
export type PortalUserAdmin = {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    is_active: boolean | number;
    created_at: string;
    access: PortalUserAccessSummary[];
};
export declare function listAllPortalUsers(): Promise<PortalUserAdmin[]>;
export declare function getPortalUserAdmin(id: string): Promise<PortalUserAdmin | null>;
export declare function updatePortalUser(id: string, input: {
    email?: string;
    full_name?: string;
    phone?: string | null;
    is_active?: boolean;
}): Promise<PortalUserAdmin | null>;
export declare function resetPortalUserPassword(id: string, password?: string): Promise<string>;
export declare function updatePortalAccessRole(accessId: string, portalRole: PortalRole): Promise<void>;
//# sourceMappingURL=portalUsers.d.ts.map