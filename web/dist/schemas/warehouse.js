"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentMaterialInputSchema = exports.workLogInputSchema = exports.warehouseStockInSchema = exports.warehouseItemInputSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.warehouseItemInputSchema = zod_1.z.object({
    sku: fields_1.optionalString,
    name: zod_1.z.string().min(1).max(255),
    description: fields_1.optionalString,
    unit: zod_1.z.string().min(1).max(20).default('gab'),
    min_quantity: zod_1.z.preprocess(fields_1.emptyToUndefined, zod_1.z.coerce.number().min(0).optional()),
});
exports.warehouseStockInSchema = zod_1.z.object({
    quantity: zod_1.z.coerce.number().positive(),
    notes: fields_1.optionalString,
});
exports.workLogInputSchema = zod_1.z.object({
    work_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration_minutes: zod_1.z.coerce.number().int().min(1).max(24 * 60),
    description: zod_1.z.string().min(1).max(2000),
    work_type: fields_1.optionalString,
    user_id: zod_1.z.preprocess(fields_1.emptyToUndefined, zod_1.z.string().uuid().optional()),
});
exports.incidentMaterialInputSchema = zod_1.z.object({
    warehouse_item_id: zod_1.z.string().uuid(),
    quantity: zod_1.z.coerce.number().positive(),
    notes: fields_1.optionalString,
});
//# sourceMappingURL=warehouse.js.map