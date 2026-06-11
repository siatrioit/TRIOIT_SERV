import { z } from 'zod';
export declare const createPortalAccessSchema: z.ZodObject<{
    email: z.ZodString;
    full_name: z.ZodString;
    phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    full_name: string;
    password?: string | undefined;
    phone?: string | undefined;
}, {
    email: string;
    full_name: string;
    password?: string | undefined;
    phone?: unknown;
}>;
//# sourceMappingURL=portalAccess.d.ts.map