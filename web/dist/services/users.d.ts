import type { UserRole } from '../models/types';
import type { createUserSchema, updateUserSchema } from '../schemas/user';
import type { z } from 'zod';
export type StaffUser = {
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
    role: UserRole;
    is_active: boolean | number;
    has_signature?: boolean;
    signature_data?: string | null;
    last_login_at?: string | null;
    created_at: string;
    updated_at: string;
};
type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;
export declare function listStaffUsers(): Promise<StaffUser[]>;
export declare function getStaffUser(id: string, includeSignature?: boolean): Promise<StaffUser | null>;
export declare function createStaffUser(input: CreateUserInput): Promise<StaffUser>;
export declare function updateStaffUser(id: string, input: UpdateUserInput, actorId: string): Promise<StaffUser | null>;
export {};
//# sourceMappingURL=users.d.ts.map