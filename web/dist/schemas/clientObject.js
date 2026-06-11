"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientObjectInputSchema = exports.clientObjectSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.clientObjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    object_code: fields_1.optionalString,
    address: fields_1.optionalString,
    city: fields_1.optionalString,
    postal_code: fields_1.optionalString,
    country: zod_1.z.preprocess(fields_1.emptyToUndefined, zod_1.z.string().length(2).default('LV')),
    latitude: zod_1.z.preprocess(fields_1.emptyToUndefined, zod_1.z.coerce.number().min(-90).max(90).optional()),
    longitude: zod_1.z.preprocess(fields_1.emptyToUndefined, zod_1.z.coerce.number().min(-180).max(180).optional()),
    contact_name: fields_1.optionalString,
    contact_phone: fields_1.optionalString,
    contact_email: fields_1.optionalEmail,
    access_notes: fields_1.optionalString,
    notes: fields_1.optionalString,
    is_primary: fields_1.boolish.optional().default(false),
    assigned_user_id: zod_1.z.preprocess((val) => (val === '' || val === null ? null : val), zod_1.z.string().uuid().nullable().optional()),
});
exports.clientObjectInputSchema = exports.clientObjectSchema.extend({
    id: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=clientObject.js.map