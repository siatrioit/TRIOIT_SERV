import type { createPortalAccessSchema } from '../schemas/portalAccess';
import type { z } from 'zod';
export type PortalAccessRow = {
    id: string;
    portal_user_id: string;
    client_id: string;
    object_id: string | null;
    scope: 'client' | 'object';
    portal_role: 'viewer' | 'operator' | 'manager';
    is_active: boolean | number;
    created_at: string;
    email: string;
    full_name: string;
    phone?: string | null;
    user_active: boolean | number;
    object_name?: string | null;
};
type CreatePortalAccessInput = z.infer<typeof createPortalAccessSchema>;
export declare function listPortalAccess(clientId: string, objectId?: string): Promise<PortalAccessRow[]>;
export declare function grantClientPortalAccess(clientId: string, input: CreatePortalAccessInput, createdBy?: string): Promise<{
    access: PortalAccessRow;
    temporaryPassword?: string;
}>;
export declare function grantObjectPortalAccess(clientId: string, objectId: string, input: CreatePortalAccessInput, createdBy?: string): Promise<{
    access: PortalAccessRow;
    temporaryPassword?: string;
}>;
export declare function revokePortalAccess(accessId: string): Promise<void>;
export {};
//# sourceMappingURL=portalAccess.d.ts.map