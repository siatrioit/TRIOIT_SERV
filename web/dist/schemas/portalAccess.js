"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPortalAccessSchema = exports.portalRoleSchema = void 0;
const zod_1 = require("zod");
const fields_1 = require("./fields");
exports.portalRoleSchema = zod_1.z.enum(['viewer', 'operator', 'manager']);
exports.createPortalAccessSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    full_name: zod_1.z.string().min(1).max(255),
    phone: fields_1.optionalString,
    password: zod_1.z.string().min(8).optional(),
    portal_role: exports.portalRoleSchema.default('operator'),
});
//# sourceMappingURL=portalAccess.js.map