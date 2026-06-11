"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatePortal = authenticatePortal;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const portalScope_1 = require("../services/portalScope");
function authenticatePortal(req, _res, next) {
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
        if (payload.type !== 'portal' || !payload.portalUserId) {
            throw new errorHandler_1.AppError(401, 'Invalid portal token', 'AUTH_INVALID');
        }
        (0, portalScope_1.getPortalUserAccess)(payload.portalUserId)
            .then((access) => {
            if (access.length === 0) {
                throw new errorHandler_1.AppError(403, 'Nav aktīvas pieejas', 'FORBIDDEN');
            }
            req.portalUser = { ...payload, access };
            next();
        })
            .catch(next);
    }
    catch (err) {
        if (err instanceof errorHandler_1.AppError) {
            next(err);
            return;
        }
        next(new errorHandler_1.AppError(401, 'Invalid or expired token', 'AUTH_INVALID'));
    }
}
//# sourceMappingURL=portalAuth.js.map