"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitUpdateSchema = exports.unitInputSchema = exports.unitStatusSchema = exports.unitTypeSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.unitTypeSchema = zod_1.z.enum(['computer', 'pos', 'printer', 'network', 'other']);
exports.unitStatusSchema = zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']);
exports.unitInputSchema = zod_1.z.object({
    unit_type: exports.unitTypeSchema.default('other'),
    serial_number: zod_1.z.string().min(1).max(100),
    model: fields_1.optionalString,
    manufacturer: fields_1.optionalString,
    status: exports.unitStatusSchema.default('active'),
    location_note: fields_1.optionalString,
    installed_at: fields_1.optionalString,
    notes: fields_1.optionalString,
});
exports.unitUpdateSchema = exports.unitInputSchema.partial();
//# sourceMappingURL=unit.js.map