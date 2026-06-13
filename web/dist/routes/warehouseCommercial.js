"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseCommercialRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const warehouseCommercial_1 = require("../services/warehouseCommercial");
const warehouseCommercial_2 = require("../schemas/warehouseCommercial");
exports.warehouseCommercialRouter = (0, express_1.Router)();
exports.warehouseCommercialRouter.use(auth_1.authenticate);
const canEdit = (0, auth_1.authorize)('admin', 'manager', 'technician');
exports.warehouseCommercialRouter.get('/groups', async (_req, res, next) => {
    try {
        res.json({ data: await (0, warehouseCommercial_1.listProductGroups)() });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/groups', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.productGroupInputSchema.parse(req.body);
        res.status(201).json({ data: await (0, warehouseCommercial_1.createProductGroup)(body) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.put('/groups/:id', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.productGroupInputSchema.partial().parse(req.body);
        res.json({ data: await (0, warehouseCommercial_1.updateProductGroup)(req.params.id, body) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.delete('/groups/:id', canEdit, async (req, res, next) => {
    try {
        await (0, warehouseCommercial_1.deleteProductGroup)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/products', async (req, res, next) => {
    try {
        const search = req.query.search;
        const groupId = req.query.group_id;
        const exactGroup = req.query.exact === '1' || req.query.exact === 'true';
        res.json({ data: await (0, warehouseCommercial_1.listProducts)(search, groupId, exactGroup) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/products', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.productInputSchema.parse(req.body);
        res.status(201).json({ data: await (0, warehouseCommercial_1.createProduct)(body, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.put('/products/:id', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.productInputSchema.partial().parse(req.body);
        res.json({ data: await (0, warehouseCommercial_1.updateProduct)(req.params.id, body) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.delete('/products/:id', canEdit, async (req, res, next) => {
    try {
        await (0, warehouseCommercial_1.deleteProduct)(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/journal/movements', async (req, res, next) => {
    try {
        const productId = req.query.product_id;
        const limitRaw = req.query.limit;
        const limit = limitRaw ? Number(limitRaw) : undefined;
        res.json({
            data: await (0, warehouseCommercial_1.listProductMovements)({
                productId,
                limit: Number.isFinite(limit) ? limit : undefined,
            }),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/receipts', async (req, res, next) => {
    try {
        const supplierId = req.query.supplier_id;
        const unpaidOnly = req.query.unpaid_only === '1' || req.query.unpaid_only === 'true';
        const sortBy = req.query.sort_by === 'supplier' ? 'supplier' : 'date';
        const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';
        res.json({
            data: await (0, warehouseCommercial_1.listReceipts)({ supplierId, unpaidOnly, sortBy, sortDir }),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/receipts/:id', async (req, res, next) => {
    try {
        const receipt = await (0, warehouseCommercial_1.getReceipt)(req.params.id);
        if (!receipt) {
            res.status(404).json({ error: 'Pavadzīme nav atrasta', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: receipt });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/receipts', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.receiptHeaderInputSchema.parse(req.body);
        res.status(201).json({ data: await (0, warehouseCommercial_1.createReceipt)(body, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.put('/receipts/:id', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.receiptHeaderInputSchema.partial().parse(req.body);
        res.json({ data: await (0, warehouseCommercial_1.updateReceipt)(req.params.id, body) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.put('/receipts/:id/lines', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.receiptLinesInputSchema.parse(req.body);
        res.json({ data: await (0, warehouseCommercial_1.updateReceiptLines)(req.params.id, body.lines) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/receipts/:id/post', canEdit, async (req, res, next) => {
    try {
        res.json({ data: await (0, warehouseCommercial_1.postReceipt)(req.params.id, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/receipts/:id/unpost', canEdit, async (req, res, next) => {
    try {
        res.json({ data: await (0, warehouseCommercial_1.unpostReceipt)(req.params.id, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/receipts/:id/pay', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.receiptPaymentInputSchema.parse(req.body);
        res.json({ data: await (0, warehouseCommercial_1.payReceipt)(req.params.id, body.amount) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/issues', async (_req, res, next) => {
    try {
        res.json({ data: await (0, warehouseCommercial_1.listIssues)() });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.get('/issues/:id', async (req, res, next) => {
    try {
        const issue = await (0, warehouseCommercial_1.getIssue)(req.params.id);
        if (!issue) {
            res.status(404).json({ error: 'Pavadzīme nav atrasta', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: issue });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/issues', canEdit, async (req, res, next) => {
    try {
        const body = warehouseCommercial_2.issueInputSchema.parse(req.body);
        res.status(201).json({ data: await (0, warehouseCommercial_1.createIssue)(body, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
exports.warehouseCommercialRouter.post('/issues/:id/post', canEdit, async (req, res, next) => {
    try {
        res.json({ data: await (0, warehouseCommercial_1.postIssue)(req.params.id, req.user?.userId) });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=warehouseCommercial.js.map