"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalUsersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const portalUsers_1 = require("../services/portalUsers");
exports.portalUsersRouter = (0, express_1.Router)();
exports.portalUsersRouter.use(auth_1.authenticate);
exports.portalUsersRouter.use((0, auth_1.authorize)('admin', 'manager'));
exports.portalUsersRouter.get('/', async (_req, res, next) => {
    try {
        const users = await (0, portalUsers_1.listAllPortalUsers)();
        res.json({ data: users });
    }
    catch (err) {
        next(err);
    }
});
exports.portalUsersRouter.get('/:id', async (req, res, next) => {
    try {
        const user = await (0, portalUsers_1.getPortalUserAdmin)(req.params.id);
        if (!user)
            throw new errorHandler_1.AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
exports.portalUsersRouter.put('/:id', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            email: zod_1.z.string().email().optional(),
            full_name: zod_1.z.string().min(1).max(255).optional(),
            phone: zod_1.z.string().max(50).nullable().optional(),
            is_active: zod_1.z.boolean().optional(),
        })
            .parse(req.body);
        const user = await (0, portalUsers_1.updatePortalUser)(req.params.id, body);
        if (!user)
            throw new errorHandler_1.AppError(404, 'Lietotājs nav atrasts', 'NOT_FOUND');
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
exports.portalUsersRouter.post('/:id/reset-password', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            password: zod_1.z.string().min(8).optional(),
        })
            .parse(req.body ?? {});
        const newPassword = await (0, portalUsers_1.resetPortalUserPassword)(req.params.id, body.password);
        res.json({ data: { password: newPassword } });
    }
    catch (err) {
        next(err);
    }
});
exports.portalUsersRouter.patch('/access/:accessId/role', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { portal_role } = zod_1.z
            .object({
            portal_role: zod_1.z.enum(['viewer', 'operator', 'manager']),
        })
            .parse(req.body);
        await (0, portalUsers_1.updatePortalAccessRole)(req.params.accessId, portal_role);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=portalUsers.js.map