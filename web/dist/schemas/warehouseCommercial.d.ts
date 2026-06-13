import { z } from 'zod';
export declare const productGroupInputSchema: z.ZodObject<{
    name: z.ZodString;
    parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sort_order?: number | undefined;
    parent_id?: string | null | undefined;
}, {
    name: string;
    sort_order?: number | undefined;
    parent_id?: string | null | undefined;
}>;
export declare const productInputSchema: z.ZodObject<{
    group_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sku: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    name: z.ZodString;
    secondary_name: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    unit: z.ZodDefault<z.ZodString>;
    min_quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    vat_rate: z.ZodOptional<z.ZodNumber>;
    purchase_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sale_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    is_service: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    unit: string;
    sku?: string | undefined;
    description?: string | undefined;
    min_quantity?: number | null | undefined;
    group_id?: string | null | undefined;
    secondary_name?: string | undefined;
    vat_rate?: number | undefined;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
    is_service?: boolean | undefined;
}, {
    name: string;
    sku?: unknown;
    description?: unknown;
    unit?: string | undefined;
    min_quantity?: number | null | undefined;
    group_id?: string | null | undefined;
    secondary_name?: unknown;
    vat_rate?: number | undefined;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
    is_service?: boolean | undefined;
}>;
export declare const receiptHeaderInputSchema: z.ZodObject<{
    supplier_id: z.ZodString;
    supplier_document_number: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    document_date: z.ZodString;
    operation_description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    supplier_id: string;
    document_date: string;
    notes?: string | undefined;
    supplier_document_number?: string | undefined;
    operation_description?: string | undefined;
}, {
    supplier_id: string;
    document_date: string;
    notes?: unknown;
    supplier_document_number?: unknown;
    operation_description?: unknown;
}>;
export declare const receiptLineInputSchema: z.ZodObject<{
    product_id: z.ZodString;
    quantity: z.ZodNumber;
    purchase_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    markup_percent: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sale_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    product_id: string;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
    markup_percent?: number | null | undefined;
}, {
    quantity: number;
    product_id: string;
    purchase_price?: number | null | undefined;
    sale_price?: number | null | undefined;
    markup_percent?: number | null | undefined;
}>;
export declare const receiptLinesInputSchema: z.ZodObject<{
    lines: z.ZodArray<z.ZodObject<{
        product_id: z.ZodString;
        quantity: z.ZodNumber;
        purchase_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        markup_percent: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        sale_price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        product_id: string;
        purchase_price?: number | null | undefined;
        sale_price?: number | null | undefined;
        markup_percent?: number | null | undefined;
    }, {
        quantity: number;
        product_id: string;
        purchase_price?: number | null | undefined;
        sale_price?: number | null | undefined;
        markup_percent?: number | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    lines: {
        quantity: number;
        product_id: string;
        purchase_price?: number | null | undefined;
        sale_price?: number | null | undefined;
        markup_percent?: number | null | undefined;
    }[];
}, {
    lines: {
        quantity: number;
        product_id: string;
        purchase_price?: number | null | undefined;
        sale_price?: number | null | undefined;
        markup_percent?: number | null | undefined;
    }[];
}>;
export declare const receiptPaymentInputSchema: z.ZodObject<{
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amount: number;
}, {
    amount: number;
}>;
export declare const issueInputSchema: z.ZodObject<{
    buyer_id: z.ZodString;
    buyer_document_number: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    document_date: z.ZodString;
    operation_description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    delivery_address: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
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
    operation_description?: string | undefined;
    buyer_document_number?: string | undefined;
    delivery_address?: string | undefined;
}, {
    document_date: string;
    lines: {
        quantity: number;
        product_id: string;
        unit_price?: number | null | undefined;
    }[];
    buyer_id: string;
    notes?: unknown;
    operation_description?: unknown;
    buyer_document_number?: unknown;
    delivery_address?: unknown;
}>;
export declare const receiptInputSchema: z.ZodObject<{
    supplier_id: z.ZodString;
    supplier_document_number: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    document_date: z.ZodString;
    operation_description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    supplier_id: string;
    document_date: string;
    notes?: string | undefined;
    supplier_document_number?: string | undefined;
    operation_description?: string | undefined;
}, {
    supplier_id: string;
    document_date: string;
    notes?: unknown;
    supplier_document_number?: unknown;
    operation_description?: unknown;
}>;
//# sourceMappingURL=warehouseCommercial.d.ts.map