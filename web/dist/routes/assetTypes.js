"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssetTypesRouter = exports.assetTypesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const assetTypes_1 = require("../services/assetTypes");
exports.assetTypesRouter = (0, express_1.Router)();
exports.assetTypesRouter.use(auth_1.authenticate);
/** GET /asset-types — aktīvie tipi (formām) */
exports.assetTypesRouter.get('/', async (req, res, next) => {
    try {
        const withComponents = req.query.include_components === '1';
        const data = await (0, assetTypes_1.listActiveAssetTypes)(withComponents);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter = (0, express_1.Router)({ mergeParams: true });
exports.setupAssetTypesRouter.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
exports.setupAssetTypesRouter.get('/', async (_req, res, next) => {
    try {
        const data = await (0, assetTypes_1.listAllAssetTypesAdmin)();
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.post('/', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            name: zod_1.z.string().min(1).max(255),
            code: zod_1.z.string().min(1).max(50).optional(),
            sort_order: zod_1.z.number().int().optional(),
        })
            .parse(req.body);
        const data = await (0, assetTypes_1.createAssetType)(body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.put('/:id', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            name: zod_1.z.string().min(1).max(255).optional(),
            sort_order: zod_1.z.number().int().optional(),
            is_active: zod_1.z.boolean().optional(),
        })
            .parse(req.body);
        const data = await (0, assetTypes_1.updateAssetType)(req.params.id, body);
        if (!data)
            throw new errorHandler_1.AppError(404, 'Tips nav atrasts', 'NOT_FOUND');
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.delete('/:id', async (req, res, next) => {
    try {
        await (0, assetTypes_1.deleteAssetType)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.post('/:typeId/components', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            name: zod_1.z.string().min(1).max(255),
            sort_order: zod_1.z.number().int().optional(),
        })
            .parse(req.body);
        const data = await (0, assetTypes_1.createAssetTypeComponent)(req.params.typeId, body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.put('/components/:componentId', async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            name: zod_1.z.string().min(1).max(255).optional(),
            sort_order: zod_1.z.number().int().optional(),
            is_active: zod_1.z.boolean().optional(),
        })
            .parse(req.body);
        const data = await (0, assetTypes_1.updateAssetTypeComponent)(req.params.componentId, body);
        if (!data)
            throw new errorHandler_1.AppError(404, 'Apakšsadaļa nav atrasta', 'NOT_FOUND');
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.setupAssetTypesRouter.delete('/components/:componentId', async (req, res, next) => {
    try {
        await (0, assetTypes_1.deleteAssetTypeComponent)(req.params.componentId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=assetTypes.js.map