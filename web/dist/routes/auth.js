"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
exports.authRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await (0, pool_1.queryOne)('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
        if (!user)
            throw new errorHandler_1.AppError(401, 'Invalid credentials', 'AUTH_FAILED');
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid)
            throw new errorHandler_1.AppError(401, 'Invalid credentials', 'AUTH_FAILED');
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new errorHandler_1.AppError(500, 'JWT not configured');
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, secret, { expiresIn: '24h' });
        res.json({
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.get('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await (0, pool_1.queryOne)('SELECT id, email, full_name, role, phone FROM users WHERE id = ?', [req.user.userId]);
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found');
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.js.map