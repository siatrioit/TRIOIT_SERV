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
const clientObject_1 = require("../schemas/clientObject");
const fields_1 = require("../schemas/fields");
const clientObjects_1 = require("../services/clientObjects");
exports.clientsRouter = (0, express_1.Router)();
exports.clientsRouter.use(auth_1.authenticate);
const clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    client_type: zod_1.z.enum(['company', 'private']).default('company'),
    registration_number: fields_1.optionalString,
    vat_number: fields_1.optionalString,
    address: fields_1.optionalString,
    city: fields_1.optionalString,
    postal_code: fields_1.optionalString,
    country: zod_1.z.string().length(2).default('LV'),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    phone: fields_1.optionalString,
    email: fields_1.optionalEmail,
    representative: fields_1.optionalString,
    notes: fields_1.optionalString,
    is_supplier: zod_1.z.coerce.boolean().optional(),
    is_buyer: zod_1.z.coerce.boolean().optional(),
    is_service_client: zod_1.z.coerce.boolean().optional(),
});
const createClientSchema = clientSchema.extend({
    objects: zod_1.z.array(clientObject_1.clientObjectInputSchema).optional(),
});
const updateClientSchema = clientSchema.partial().extend({
    objects: zod_1.z.array(clientObject_1.clientObjectInputSchema).optional(),
});
/** GET /clients — saraksts ar filtriem */
exports.clientsRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const search = req.query.search;
        const city = req.query.city;
        const serviceOnly = req.query.service_only === '1' || req.query.service_only === 'true';
        const warehouseOnly = req.query.warehouse === '1' || req.query.warehouse === 'true';
        let where = 'WHERE c.is_active = 1';
        const params = [];
        if (serviceOnly) {
            where += ' AND c.is_service_client = 1';
        }
        if (warehouseOnly) {
            where += ' AND (c.is_supplier = 1 OR c.is_buyer = 1 OR c.is_service_client = 1)';
        }
        if (search) {
            where += ` AND (
        c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
        OR c.registration_number LIKE ? OR c.vat_number LIKE ?
        OR EXISTS (
          SELECT 1 FROM client_objects co
          WHERE co.client_id = c.id AND co.is_active = 1 AND co.status = 'active'
          AND (
            co.name LIKE ? OR co.address LIKE ? OR co.city LIKE ?
            OR co.object_code LIKE ?
          )
        )
      )`;
            const term = `%${search}%`;
            params.push(term, term, term, term, term, term, term, term, term);
        }
        if (city) {
            where += ' AND c.city = ?';
            params.push(city);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM clients c ${where}`, params);
        const total = countRow?.total ?? 0;
        const clients = await (0, pool_1.query)(`SELECT c.*,

        (SELECT COUNT(*) FROM client_objects co

         WHERE co.client_id = c.id AND co.is_active = 1 AND co.status = 'active') AS object_count

       FROM clients c ${where}

       ORDER BY c.name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
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
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ? AND is_active = 1', [req.params.id]);
        if (!client)
            throw new errorHandler_1.AppError(404, 'Client not found', 'NOT_FOUND');
        const objects = await (0, clientObjects_1.listClientObjects)(req.params.id, 'active');
        const closed_objects = await (0, clientObjects_1.listClientObjects)(req.params.id, 'closed');
        res.json({ data: { ...client, objects, closed_objects } });
    }
    catch (err) {
        next(err);
    }
});
/** POST /clients — var uzreiz pievienot objektus */
exports.clientsRouter.post('/', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = createClientSchema.parse(req.body);
        const { objects, ...clientFields } = body;
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO clients (id, name, client_type, registration_number, vat_number, address, city, postal_code, country,

        latitude, longitude, phone, email, representative, notes,
        is_supplier, is_buyer, is_service_client, created_by)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            clientFields.name,
            clientFields.client_type,
            clientFields.registration_number ?? null,
            clientFields.vat_number ?? null,
            clientFields.address ?? null,
            clientFields.city ?? null,
            clientFields.postal_code ?? null,
            clientFields.country,
            clientFields.latitude ?? null,
            clientFields.longitude ?? null,
            clientFields.phone ?? null,
            clientFields.email || null,
            clientFields.representative ?? null,
            clientFields.notes ?? null,
            clientFields.is_supplier ? 1 : 0,
            clientFields.is_buyer ? 1 : 0,
            clientFields.is_service_client ? 1 : 0,
            req.user?.userId,
        ]);
        let savedObjects = [];
        if (objects?.length) {
            savedObjects = await (0, clientObjects_1.syncClientObjects)(id, objects, req.user?.userId);
        }
        else if (clientFields.address || clientFields.city) {
            savedObjects = [
                await (0, clientObjects_1.insertClientObject)(id, {
                    name: clientFields.name,
                    address: clientFields.address,
                    city: clientFields.city,
                    postal_code: clientFields.postal_code,
                    country: clientFields.country,
                    latitude: clientFields.latitude,
                    longitude: clientFields.longitude,
                    contact_phone: clientFields.phone,
                    contact_email: clientFields.email,
                    is_primary: true,
                }, req.user?.userId),
            ];
        }
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ?', [id]);
        res.status(201).json({ data: { ...client, objects: savedObjects } });
    }
    catch (err) {
        next(err);
    }
});
/** PUT /clients/:id — atjaunina klientu un/vai objektus */
exports.clientsRouter.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = updateClientSchema.parse(req.body);
        const { objects, ...clientFields } = body;
        const existing = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ? AND is_active = 1', [
            req.params.id,
        ]);
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Client not found');
        const fields = Object.keys(clientFields);
        if (fields.length > 0) {
            const setClause = fields.map((f) => `${f} = ?`).join(', ');
            await (0, pool_1.query)(`UPDATE clients SET ${setClause} WHERE id = ?`, [
                ...fields.map((f) => {
                    const v = clientFields[f];
                    if (f === 'email' && v === '')
                        return null;
                    return v ?? null;
                }),
                req.params.id,
            ]);
        }
        let savedObjects;
        if (objects) {
            savedObjects = await (0, clientObjects_1.syncClientObjects)(req.params.id, objects, req.user?.userId);
        }
        else {
            savedObjects = await (0, clientObjects_1.listClientObjects)(req.params.id);
        }
        const client = await (0, pool_1.queryOne)('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        res.json({ data: { ...client, objects: savedObjects } });
    }
    catch (err) {
        next(err);
    }
});
/** DELETE /clients/:id — soft delete */
exports.clientsRouter.delete('/:id', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        await (0, pool_1.query)('UPDATE clients SET is_active = 0 WHERE id = ?', [req.params.id]);
        await (0, pool_1.query)('UPDATE client_objects SET is_active = 0 WHERE client_id = ?', [req.params.id]);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=clients.js.map