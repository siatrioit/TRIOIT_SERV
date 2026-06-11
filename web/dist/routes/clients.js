"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
exports.clientsRouter = (0, express_1.Router)();
exports.clientsRouter.use(auth_1.authenticate);
const clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    client_type: zod_1.z.enum(['company', 'private']).default('company'),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    postal_code: zod_1.z.string().optional(),
    country: zod_1.z.string().length(2).default('LV'),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    representative: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
/** GET /clients — saraksts ar filtriem */
exports.clientsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const search = req.query.search;
        const city = req.query.city;
        let where = 'WHERE is_active = 1';
        const params = [];
        if (search) {
            where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }
        if (city) {
            where += ' AND city = ?';
            params.push(city);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM clients ${where}`, params);
        const total = countRow?.total ?? 0;
        const clients = await (0, pool_1.query)(`SELECT * FROM clients ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        res.json({
            data: clients,
            pagination: (0, pagination_1.buildPaginationMeta)(total, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
/** GET /clients/:id */
exports.clientsRouter.get('/:id', async (req, res, next) => {
    try {
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!client)
            throw new errorHandler_1.AppError(404, 'Client not found', 'NOT_FOUND');
        res.json({ data: client });
    }
    catch (err) {
        next(err);
    }
});
/** POST /clients */
exports.clientsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = clientSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO clients (id, name, client_type, address, city, postal_code, country,
        latitude, longitude, phone, email, representative, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, body.name, body.client_type, body.address, body.city, body.postal_code,
            body.country, body.latitude, body.longitude, body.phone,
            body.email || null, body.representative, body.notes, req.user?.userId,
        ]);
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ?', [id]);
        res.status(201).json({ data: client });
    }
    catch (err) {
        next(err);
    }
});
/** PUT /clients/:id */
exports.clientsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = clientSchema.partial().parse(req.body);
        const existing = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ?', [req.params.id]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Client not found');
        const fields = Object.keys(body);
        if (fields.length === 0)
            throw new errorHandler_1.AppError(400, 'No fields to update');
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        await (0, pool_1.query)(`UPDATE clients SET ${setClause} WHERE id = ?`, [...fields.map((f) => body[f]), req.params.id]);
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        res.json({ data: client });
    }
    catch (err) {
        next(err);
    }
});
/** DELETE /clients/:id — soft delete */
exports.clientsRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const result = await (0, pool_1.query)('UPDATE clients SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=clients.js.map