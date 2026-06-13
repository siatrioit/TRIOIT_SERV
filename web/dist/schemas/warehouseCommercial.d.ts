import { z } from 'zod';
export declare const productGroupInputSchema: z.ZodObject<{
    name: z.ZodString;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sort_order?: number | undefined;
}, {
    name: string;
    sort_order?: number | undefined;
}>;
export declare const productInputSchema: z.ZodObject<{
    group_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sku: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    name: z.ZodString;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    unit: z.ZodDefault<z.ZodString>;
    min_quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    purchase_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sale_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    unit: string;
    description?: string | undefined;
    sku?: string | undefined;
    min_quantity?: number | null | undefined;
    group_id?: string | null | undefined;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
}, {
    name: string;
    description?: unknown;
    sku?: unknown;
    unit?: string | undefined;
    min_quantity?: number | null | undefined;
    group_id?: string | null | undefined;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
}>;
export declare const receiptInputSchema: z.ZodObject<{
    supplier_id: z.ZodString;
    document_date: z.ZodString;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    lines: z.ZodArray<z.ZodObject<{
        product_id: z.ZodString;
        quantity: z.ZodNumber;
        unit_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }, {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    supplier_id: string;
    document_date: string;
    lines: {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }[];
    notes?: string | undefined;
}, {
    supplier_id: string;
    document_date: string;
    lines: {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }[];
    notes?: unknown;
}>;
export declare const issueInputSchema: z.ZodObject<{
    buyer_id: z.ZodString;
    document_date: z.ZodString;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    lines: z.ZodArray<z.ZodObject<{
        product_id: z.ZodString;
        quantity: z.ZodNumber;
        unit_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }, {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    document_date: string;
    lines: {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }[];
    buyer_id: string;
    notes?: string | undefined;
}, {
    document_date: string;
    lines: {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }[];
    buyer_id: string;
    notes?: unknown;
}>;
//# sourceMappingURL=warehouseCommercial.d.ts.map