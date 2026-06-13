"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueInputSchema = exports.receiptInputSchema = exports.productInputSchema = exports.productGroupInputSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.productGroupInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    sort_order: zod_1.z.number().int().optional(),
});
exports.productInputSchema = zod_1.z.object({
    group_id: zod_1.z.string().uuid().nullable().optional(),
    sku: fields_1.optionalString,
    name: zod_1.z.string().min(1).max(255),
    description: fields_1.optionalString,
    unit: zod_1.z.string().min(1).max(20).default('gab'),
    min_quantity: zod_1.z.number().nonnegative().nullable().optional(),
    purchase_price: zod_1.z.number().nonnegative().nullable().optional(),
    sale_price: zod_1.z.number().nonnegative().nullable().optional(),
});
const lineSchema = zod_1.z.object({
    product_id: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().positive(),
    unit_price: zod_1.z.number().nonnegative().nullable().optional(),
});
exports.receiptInputSchema = zod_1.z.object({
    supplier_id: zod_1.z.string().uuid(),
    document_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: fields_1.optionalString,
    lines: zod_1.z.array(lineSchema).min(1),
});
exports.issueInputSchema = zod_1.z.object({
    buyer_id: zod_1.z.string().uuid(),
    document_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: fields_1.optionalString,
    lines: zod_1.z.array(lineSchema).min(1),
});
//# sourceMappingURL=warehouseCommercial.js.map