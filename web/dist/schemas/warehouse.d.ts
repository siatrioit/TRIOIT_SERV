import { z } from 'zod';
export declare const warehouseItemInputSchema: z.ZodObject<{
    sku: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    name: z.ZodString;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    unit: z.ZodDefault<z.ZodString>;
    min_quantity: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    unit: string;
    description?: string | undefined;
    sku?: string | undefined;
    min_quantity?: number | undefined;
}, {
    name: string;
    description?: unknown;
    sku?: unknown;
    unit?: string | undefined;
    min_quantity?: unknown;
}>;
export declare const warehouseStockInSchema: z.ZodObject<{
    quantity: z.ZodNumber;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    notes?: string | undefined;
}, {
    quantity: number;
    notes?: unknown;
}>;
export declare const workLogInputSchema: z.ZodObject<{
    work_date: z.ZodString;
    duration_minutes: z.ZodNumber;
    description: z.ZodString;
    work_type: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    user_id: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    description: string;
    work_date: string;
    duration_minutes: number;
    work_type?: string | undefined;
    user_id?: string | undefined;
}, {
    description: string;
    work_date: string;
    duration_minutes: number;
    work_type?: unknown;
    user_id?: unknown;
}>;
export declare const incidentMaterialInputSchema: z.ZodObject<{
    warehouse_item_id: z.ZodString;
    quantity: z.ZodNumber;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    warehouse_item_id: string;
    notes?: string | undefined;
}, {
    quantity: number;
    warehouse_item_id: string;
    notes?: unknown;
}>;
//# sourceMappingURL=warehouse.d.ts.map