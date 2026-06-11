"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = exports.userRoleSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.userRoleSchema = zod_1.z.enum(['admin', 'manager', 'technician', 'viewer']);
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, 'Parolei jābūt vismaz 8 rakstzīmēm'),
    full_name: zod_1.z.string().min(1).max(255),
    phone: fields_1.optionalString,
    role: exports.userRoleSchema.default('technician'),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    full_name: zod_1.z.string().min(1).max(255).optional(),
    phone: fields_1.optionalString,
    role: exports.userRoleSchema.optional(),
    is_active: zod_1.z.boolean().optional(),
    password: zod_1.z.string().min(8).optional(),
});
//# sourceMappingURL=user.js.map