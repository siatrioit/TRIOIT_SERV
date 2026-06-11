"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalAccessRouter = exports.objectPortalAccessRouter = exports.clientPortalAccessRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const portalAccess_1 = require("../schemas/portalAccess");
const portalAccess_2 = require("../services/portalAccess");
exports.clientPortalAccessRouter = (0, express_1.Router)({ mergeParams: true });
exports.objectPortalAccessRouter = (0, express_1.Router)({ mergeParams: true });
exports.portalAccessRouter = (0, express_1.Router)();
exports.clientPortalAccessRouter.use(auth_1.authenticate);
exports.objectPortalAccessRouter.use(auth_1.authenticate);
exports.portalAccessRouter.use(auth_1.authenticate);
exports.clientPortalAccessRouter.get('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId } = req.params;
        const rows = await (0, portalAccess_2.listPortalAccess)(clientId);
        res.json({ data: rows });
    }
    catch (err) {
        next(err);
    }
});
exports.clientPortalAccessRouter.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId } = req.params;
        const body = portalAccess_1.createPortalAccessSchema.parse(req.body);
        const result = await (0, portalAccess_2.grantClientPortalAccess)(clientId, body, req.user?.userId);
        res.status(201).json({
            data: result.access,
            temporary_password: result.temporaryPassword,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.objectPortalAccessRouter.get('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, objectId } = req.params;
        const rows = await (0, portalAccess_2.listPortalAccess)(clientId, objectId);
        res.json({ data: rows });
    }
    catch (err) {
        next(err);
    }
});
exports.objectPortalAccessRouter.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { clientId, objectId } = req.params;
        const body = portalAccess_1.createPortalAccessSchema.parse(req.body);
        const result = await (0, portalAccess_2.grantObjectPortalAccess)(clientId, objectId, body, req.user?.userId);
        res.status(201).json({
            data: result.access,
            temporary_password: result.temporaryPassword,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.portalAccessRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        await (0, portalAccess_2.revokePortalAccess)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=portalAccess.js.map