"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalAuthRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const pool_1 = require("../../db/pool");
const portalAuth_1 = require("../../middleware/portalAuth");
const errorHandler_1 = require("../../middleware/errorHandler");
const portalScope_1 = require("../../services/portalScope");
exports.portalAuthRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.portalAuthRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await (0, pool_1.queryOne)('SELECT * FROM portal_users WHERE email = ? AND is_active = 1', [email]);
        if (!user)
            throw new errorHandler_1.AppError(401, 'Nepareizs e-pasts vai parole', 'AUTH_FAILED');
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid)
            throw new errorHandler_1.AppError(401, 'Nepareizs e-pasts vai parole', 'AUTH_FAILED');
        const access = await (0, portalScope_1.getPortalUserAccess)(user.id);
        if (access.length === 0) {
            throw new errorHandler_1.AppError(403, 'Kontam nav piešķirta pieeja', 'NO_ACCESS');
        }
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new errorHandler_1.AppError(500, 'JWT not configured');
        const token = jsonwebtoken_1.default.sign({ type: 'portal', portalUserId: user.id, email: user.email }, secret, { expiresIn: '7d' });
        const objects = await (0, portalScope_1.listAccessibleObjects)(access);
        res.json({
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                },
                access,
                objects,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.portalAuthRouter.get('/me', portalAuth_1.authenticatePortal, async (req, res, next) => {
    try {
        const { portalUserId, email, access } = req.portalUser;
        const user = await (0, pool_1.queryOne)('SELECT id, email, full_name, phone FROM portal_users WHERE id = ?', [portalUserId]);
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found', 'NOT_FOUND');
        const objects = await (0, portalScope_1.listAccessibleObjects)(access);
        res.json({
            data: {
                user,
                email,
                access,
                objects,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.js.map