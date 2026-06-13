import { z } from 'zod';
export declare const userRoleSchema: z.ZodEnum<["admin", "manager", "technician", "viewer"]>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    full_name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    role: z.ZodDefault<z.ZodEnum<["admin", "manager", "technician", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    password: string;
    role: "admin" | "manager" | "technician" | "viewer";
    email: string;
    full_name: string;
    phone?: string | undefined;
}, {
    password: string;
    email: string;
    full_name: string;
    role?: "admin" | "manager" | "technician" | "viewer" | undefined;
    phone?: unknown;
}>;
export declare const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    full_name: z.ZodOptional<z.ZodString>;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    role: z.ZodOptional<z.ZodEnum<["admin", "manager", "technician", "viewer"]>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
    role?: "admin" | "manager" | "technician" | "viewer" | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    is_active?: boolean | undefined;
    full_name?: string | undefined;
}, {
    password?: string | undefined;
    role?: "admin" | "manager" | "technician" | "viewer" | undefined;
    email?: string | undefined;
    phone?: unknown;
    is_active?: boolean | undefined;
    full_name?: string | undefined;
}>;
//# sourceMappingURL=user.d.ts.map