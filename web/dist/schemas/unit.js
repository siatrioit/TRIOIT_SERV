"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitUpdateSchema = exports.unitInputSchema = exports.unitStatusSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.unitStatusSchema = zod_1.z.enum(['active', 'repair', 'decommissioned', 'spare']);
const unitFieldsSchema = zod_1.z.object({
    asset_type_id: zod_1.z.string().uuid().optional(),
    unit_type: zod_1.z.string().min(1).max(50).optional(),
    asset_component_id: zod_1.z.string().uuid().nullable().optional(),
    parent_unit_id: zod_1.z.string().uuid().nullable().optional(),
    serial_number: zod_1.z.string().min(1).max(100),
    model: fields_1.optionalString,
    manufacturer: fields_1.optionalString,
    status: exports.unitStatusSchema.default('active'),
    location_note: fields_1.optionalString,
    installed_at: fields_1.optionalString,
    notes: fields_1.optionalString,
});
exports.unitInputSchema = unitFieldsSchema.superRefine((data, ctx) => {
    if (data.parent_unit_id) {
        if (!data.asset_component_id) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'Apakšaktīvam jānorāda apakšsadaļa',
                path: ['asset_component_id'],
            });
        }
        return;
    }
    if (!data.asset_type_id && !data.unit_type) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Norādiet aktīva tipu',
            path: ['asset_type_id'],
        });
    }
});
exports.unitUpdateSchema = unitFieldsSchema.partial();
//# sourceMappingURL=unit.js.map