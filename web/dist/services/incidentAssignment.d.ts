import type { UserRole } from '../models/types';
export type AssignableStaff = {
    id: string;
    full_name: string;
    role: UserRole;
};
export declare function listAssignableStaff(): Promise<AssignableStaff[]>;
export declare function listAssignableStaffUserIds(): Promise<string[]>;
export declare function assertAssignableUser(userId: string): Promise<AssignableStaff>;
export declare function getObjectDefaultAssignee(objectId: string | null | undefined): Promise<string | null>;
/** Ja nav norādīts explicit — ņem no objekta; viewer netiek piešķirts */
export declare function resolveIncidentAssignee(objectId: string | null | undefined, explicitAssignedTo?: string | null): Promise<string | null>;
export declare function isAssignableRole(role: UserRole): boolean;
//# sourceMappingURL=incidentAssignment.d.ts.map