import { z } from 'zod';
export declare const portalRoleSchema: z.ZodEnum<["viewer", "operator", "manager"]>;
export declare const createPortalAccessSchema: z.ZodObject<{
    email: z.ZodString;
    full_name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    password: z.ZodOptional<z.ZodString>;
    portal_role: z.ZodDefault<z.ZodEnum<["viewer", "operator", "manager"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    full_name: string;
    portal_role: "manager" | "viewer" | "operator";
    password?: string | undefined;
    phone?: string | undefined;
}, {
    email: string;
    full_name: string;
    password?: string | undefined;
    phone?: unknown;
    portal_role?: "manager" | "viewer" | "operator" | undefined;
}>;
//# sourceMappingURL=portalAccess.d.ts.map