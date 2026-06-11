import { z } from 'zod';
export declare const unitTypeSchema: z.ZodEnum<["computer", "pos", "printer", "network", "other"]>;
export declare const unitStatusSchema: z.ZodEnum<["active", "repair", "decommissioned", "spare"]>;
export declare const unitInputSchema: z.ZodObject<{
    unit_type: z.ZodDefault<z.ZodEnum<["computer", "pos", "printer", "network", "other"]>>;
    serial_number: z.ZodString;
    model: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    manufacturer: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    status: z.ZodDefault<z.ZodEnum<["active", "repair", "decommissioned", "spare"]>>;
    location_note: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    installed_at: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "repair" | "decommissioned" | "spare";
    unit_type: "computer" | "pos" | "printer" | "network" | "other";
    serial_number: string;
    notes?: string | undefined;
    model?: string | undefined;
    manufacturer?: string | undefined;
    location_note?: string | undefined;
    installed_at?: string | undefined;
}, {
    serial_number: string;
    status?: "active" | "repair" | "decommissioned" | "spare" | undefined;
    notes?: unknown;
    unit_type?: "computer" | "pos" | "printer" | "network" | "other" | undefined;
    model?: unknown;
    manufacturer?: unknown;
    location_note?: unknown;
    installed_at?: unknown;
}>;
export declare const unitUpdateSchema: z.ZodObject<{
    unit_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["computer", "pos", "printer", "network", "other"]>>>;
    serial_number: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>>;
    manufacturer: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "repair", "decommissioned", "spare"]>>>;
    location_note: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>>;
    installed_at: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>>;
    notes: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "repair" | "decommissioned" | "spare" | undefined;
    notes?: string | undefined;
    unit_type?: "computer" | "pos" | "printer" | "network" | "other" | undefined;
    serial_number?: string | undefined;
    model?: string | undefined;
    manufacturer?: string | undefined;
    location_note?: string | undefined;
    installed_at?: string | undefined;
}, {
    status?: "active" | "repair" | "decommissioned" | "spare" | undefined;
    notes?: unknown;
    unit_type?: "computer" | "pos" | "printer" | "network" | "other" | undefined;
    serial_number?: string | undefined;
    model?: unknown;
    manufacturer?: unknown;
    location_note?: unknown;
    installed_at?: unknown;
}>;
//# sourceMappingURL=unit.d.ts.map