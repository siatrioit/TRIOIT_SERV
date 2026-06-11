"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientObjectInputSchema = exports.clientObjectSchema = void 0;
const zod_1 = require("zod");
exports.clientObjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    object_code: zod_1.z.string().max(50).optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    postal_code: zod_1.z.string().optional(),
    country: zod_1.z.string().length(2).default('LV'),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    contact_name: zod_1.z.string().optional(),
    contact_phone: zod_1.z.string().optional(),
    contact_email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    access_notes: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    is_primary: zod_1.z.boolean().default(false),
});
exports.clientObjectInputSchema = exports.clientObjectSchema.extend({
    id: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=clientObject.js.map