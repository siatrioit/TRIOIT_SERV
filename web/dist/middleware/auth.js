"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new errorHandler_1.AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new errorHandler_1.AppError(500, 'JWT not configured');
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (payload.type === 'portal') {
            throw new errorHandler_1.AppError(401, 'Invalid staff token', 'AUTH_INVALID');
        }
        req.user = payload;
        next();
    }
    catch (err) {
        if (err instanceof errorHandler_1.AppError) {
            next(err);
            return;
        }
        throw new errorHandler_1.AppError(401, 'Invalid or expired token', 'AUTH_INVALID');
    }
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new errorHandler_1.AppError(401, 'Authentication required');
        }
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            throw new errorHandler_1.AppError(403, 'Insufficient permissions', 'FORBIDDEN');
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map