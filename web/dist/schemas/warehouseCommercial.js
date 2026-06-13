"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptInputSchema = exports.issueInputSchema = exports.receiptPaymentInputSchema = exports.receiptLinesInputSchema = exports.receiptLineInputSchema = exports.receiptHeaderInputSchema = exports.productInputSchema = exports.productGroupInputSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.productGroupInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    parent_id: zod_1.z.string().uuid().nullable().optional(),
    sort_order: zod_1.z.number().int().optional(),
});
exports.productInputSchema = zod_1.z.object({
    group_id: zod_1.z.string().uuid().nullable().optional(),
    sku: fields_1.optionalString,
    name: zod_1.z.string().min(1).max(255),
    secondary_name: fields_1.optionalString,
    description: fields_1.optionalString,
    unit: zod_1.z.string().min(1).max(20).default('gab'),
    min_quantity: zod_1.z.number().nonnegative().nullable().optional(),
    vat_rate: zod_1.z.number().min(0).max(100).optional(),
    purchase_price: zod_1.z.number().nonnegative().nullable().optional(),
    sale_price: zod_1.z.number().nonnegative().nullable().optional(),
    is_service: zod_1.z.coerce.boolean().optional(),
});
const issueLineSchema = zod_1.z.object({
    product_id: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().positive(),
    unit_price: zod_1.z.number().nonnegative().nullable().optional(),
});
exports.receiptHeaderInputSchema = zod_1.z.object({
    supplier_id: zod_1.z.string().uuid(),
    supplier_document_number: fields_1.optionalString,
    document_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    operation_description: fields_1.optionalString,
    notes: fields_1.optionalString,
});
exports.receiptLineInputSchema = zod_1.z.object({
    product_id: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().positive(),
    purchase_price: zod_1.z.number().nonnegative().nullable().optional(),
    markup_percent: zod_1.z.number().nullable().optional(),
    sale_price: zod_1.z.number().nonnegative().nullable().optional(),
});
exports.receiptLinesInputSchema = zod_1.z.object({
    lines: zod_1.z.array(exports.receiptLineInputSchema).min(1),
});
exports.receiptPaymentInputSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
});
exports.issueInputSchema = zod_1.z.object({
    buyer_id: zod_1.z.string().uuid(),
    buyer_document_number: fields_1.optionalString,
    document_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    operation_description: fields_1.optionalString,
    delivery_address: fields_1.optionalString,
    notes: fields_1.optionalString,
    lines: zod_1.z.array(issueLineSchema).min(1),
});
exports.receiptInputSchema = exports.receiptHeaderInputSchema;
//# sourceMappingURL=warehouseCommercial.js.map