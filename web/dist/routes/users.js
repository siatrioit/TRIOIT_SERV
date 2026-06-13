"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const user_1 = require("../schemas/user");
const users_1 = require("../services/users");
const incidentAssignment_1 = require("../services/incidentAssignment");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_1.authenticate);
exports.usersRouter.get('/assignable', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (_req, res, next) => {
    try {
        const users = await (0, incidentAssignment_1.listAssignableStaff)();
        res.json({ data: users });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.get('/', (0, auth_1.authorize)('admin', 'manager'), async (_req, res, next) => {
    try {
        const users = await (0, users_1.listStaffUsers)();
        res.json({ data: users });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.get('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const user = await (0, users_1.getStaffUser)(req.params.id, true);
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found', 'NOT_FOUND');
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.post('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const body = user_1.createUserSchema.parse(req.body);
        const user = await (0, users_1.createStaffUser)(body);
        res.status(201).json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.put('/:id', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const body = user_1.updateUserSchema.parse(req.body);
        const user = await (0, users_1.updateStaffUser)(req.params.id, body, req.user.userId);
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found', 'NOT_FOUND');
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=users.js.map