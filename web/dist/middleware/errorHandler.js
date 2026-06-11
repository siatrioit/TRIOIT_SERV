"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
}
//# sourceMappingURL=errorHandler.js.map