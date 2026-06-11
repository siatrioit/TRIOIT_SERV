"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
exports.contractsRouter = (0, express_1.Router)();
exports.contractsRouter.use(auth_1.authenticate);
const contractSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    contract_number: zod_1.z.string().min(1).max(50),
    title: zod_1.z.string().min(1).max(255),
    start_date: zod_1.z.string(),
    end_date: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'expired', 'renewable', 'draft', 'cancelled']).default('draft'),
    monthly_fee: zod_1.z.number().optional(),
    terms: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    document_url: zod_1.z.string().url().optional(),
});
exports.contractsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const clientId = req.query.client_id;
        const status = req.query.status;
        let where = 'WHERE 1=1';
        const params = [];
        if (clientId) {
            where += ' AND client_id = ?';
            params.push(clientId);
        }
        if (status) {
            where += ' AND status = ?';
            params.push(status);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM contracts ${where}`, params);
        const contracts = await (0, pool_1.query)(`SELECT * FROM contracts ${where} ORDER BY start_date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        res.json({
            data: contracts,
            pagination: (0, pagination_1.buildPaginationMeta)(countRow?.total ?? 0, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.contractsRouter.get('/:id', async (req, res, next) => {
    try {
        const contract = await (0, pool_1.queryOne)('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
        if (!contract)
            throw new errorHandler_1.AppError(404, 'Contract not found');
        res.json({ data: contract });
    }
    catch (err) {
        next(err);
    }
});
exports.contractsRouter.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const body = contractSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO contracts (id, client_id, contract_number, title, start_date, end_date,
        status, monthly_fee, terms, notes, document_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, body.client_id, body.contract_number, body.title, body.start_date,
            body.end_date, body.status, body.monthly_fee, body.terms, body.notes,
            body.document_url, req.user?.userId,
        ]);
        const contract = await (0, pool_1.queryOne)('SELECT * FROM contracts WHERE id = ?', [id]);
        res.status(201).json({ data: contract });
    }
    catch (err) {
        next(err);
    }
});
exports.contractsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const body = contractSchema.partial().parse(req.body);
        const fields = Object.keys(body);
        if (fields.length === 0)
            throw new errorHandler_1.AppError(400, 'No fields to update');
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        await (0, pool_1.query)(`UPDATE contracts SET ${setClause} WHERE id = ?`, [...fields.map((f) => body[f]), req.params.id]);
        const contract = await (0, pool_1.queryOne)('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ data: contract });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=contracts.js.map