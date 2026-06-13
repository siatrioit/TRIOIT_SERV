"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySettingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const companySettings_1 = require("../services/companySettings");
exports.companySettingsRouter = (0, express_1.Router)();
const updateSchema = zod_1.z.object({
    company_name: zod_1.z.string().max(255).optional(),
    header_line1: zod_1.z.string().max(255).nullable().optional(),
    header_line2: zod_1.z.string().max(255).nullable().optional(),
    header_line3: zod_1.z.string().max(255).nullable().optional(),
    registration_number: zod_1.z.string().max(50).nullable().optional(),
    vat_number: zod_1.z.string().max(50).nullable().optional(),
    address: zod_1.z.string().max(2000).nullable().optional(),
    phone: zod_1.z.string().max(50).nullable().optional(),
    email: zod_1.z.string().max(255).nullable().optional(),
    bank_name: zod_1.z.string().max(255).nullable().optional(),
    bank_account: zod_1.z.string().max(100).nullable().optional(),
});
exports.companySettingsRouter.use(auth_1.authenticate);
exports.companySettingsRouter.get('/', (0, auth_1.authorize)('admin', 'manager', 'technician', 'viewer'), async (_req, res, next) => {
    try {
        const data = await (0, companySettings_1.getCompanySettings)();
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.companySettingsRouter.put('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const body = updateSchema.parse(req.body);
        const data = await (0, companySettings_1.updateCompanySettings)(body, req.user.userId);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=companySettings.js.map