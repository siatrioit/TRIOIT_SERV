"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const pagination_1 = require("../utils/pagination");
const errorHandler_1 = require("../middleware/errorHandler");
exports.invoicesRouter = (0, express_1.Router)();
exports.invoicesRouter.use(auth_1.authenticate);
const invoiceItemSchema = zod_1.z.object({
    service_id: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive().default(1),
    unit_price: zod_1.z.number().min(0),
    transport_cost: zod_1.z.number().min(0).default(0),
});
const createInvoiceSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    incident_id: zod_1.z.string().uuid().optional(),
    contract_id: zod_1.z.string().uuid().optional(),
    issue_date: zod_1.z.string().optional(),
    due_date: zod_1.z.string().optional(),
    tax_rate: zod_1.z.number().default(21),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(invoiceItemSchema).min(1),
});
function generateInvoiceNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INV-${date}-${rand}`;
}
exports.invoicesRouter.get('/', async (req, res, next) => {
    try {
        const { page, limit, offset } = (0, pagination_1.parsePagination)(req.query);
        const status = req.query.status;
        const clientId = req.query.client_id;
        let where = 'WHERE 1=1';
        const params = [];
        if (status) {
            where += ' AND status = ?';
            params.push(status);
        }
        if (clientId) {
            where += ' AND client_id = ?';
            params.push(clientId);
        }
        const countRow = await (0, pool_1.queryOne)(`SELECT COUNT(*) as total FROM invoices ${where}`, params);
        const invoices = await (0, pool_1.query)(`SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
        res.json({
            data: invoices,
            pagination: (0, pagination_1.buildPaginationMeta)(countRow?.total ?? 0, page, limit),
        });
    }
    catch (err) {
        next(err);
    }
});
/** POST /invoices — automātiska izveide no atgadījuma vai manuāli */
exports.invoicesRouter.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const body = createInvoiceSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        const invoiceNumber = generateInvoiceNumber();
        let subtotal = 0;
        const items = body.items.map((item) => {
            const lineTotal = item.quantity * item.unit_price + item.transport_cost;
            subtotal += lineTotal;
            return { ...item, line_total: lineTotal };
        });
        const taxAmount = subtotal * (body.tax_rate / 100);
        const total = subtotal + taxAmount;
        await (0, pool_1.query)(`INSERT INTO invoices (id, invoice_number, client_id, incident_id, contract_id,
        status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, invoiceNumber, body.client_id, body.incident_id, body.contract_id,
            body.issue_date || new Date().toISOString().slice(0, 10),
            body.due_date, subtotal, body.tax_rate, taxAmount, total, body.notes,
            req.user?.userId,
        ]);
        for (const item of items) {
            await (0, pool_1.query)(`INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, transport_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, item.service_id, item.description, item.quantity, item.unit_price, item.transport_cost, item.line_total]);
        }
        const invoice = await (0, pool_1.queryOne)('SELECT * FROM invoices WHERE id = ?', [id]);
        res.status(201).json({ data: invoice });
    }
    catch (err) {
        next(err);
    }
});
/** POST /invoices/from-incident/:incidentId */
exports.invoicesRouter.post('/from-incident/:incidentId', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const incident = await (0, pool_1.queryOne)('SELECT client_id, contract_id FROM incidents WHERE id = ?', [req.params.incidentId]);
        if (!incident)
            throw new errorHandler_1.AppError(404, 'Incident not found');
        const incidentServices = await (0, pool_1.query)(`SELECT isv.*, s.name FROM incident_services isv
       JOIN services s ON isv.service_id = s.id
       WHERE isv.incident_id = ?`, [req.params.incidentId]);
        if (incidentServices.length === 0) {
            throw new errorHandler_1.AppError(400, 'Incident has no services attached');
        }
        req.body = {
            client_id: incident.client_id,
            incident_id: req.params.incidentId,
            contract_id: incident.contract_id,
            items: incidentServices.map((s) => ({
                service_id: s.service_id,
                description: s.name,
                quantity: s.quantity,
                unit_price: s.unit_price,
                transport_cost: s.transport_cost,
            })),
        };
        // Delegate to create handler logic inline
        const body = createInvoiceSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        const invoiceNumber = generateInvoiceNumber();
        let subtotal = 0;
        const items = body.items.map((item) => {
            const lineTotal = item.quantity * item.unit_price + item.transport_cost;
            subtotal += lineTotal;
            return { ...item, line_total: lineTotal };
        });
        const taxRate = 21;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        await (0, pool_1.query)(`INSERT INTO invoices (id, invoice_number, client_id, incident_id, contract_id,
        status, issue_date, subtotal, tax_rate, tax_amount, total, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', CURDATE(), ?, ?, ?, ?, ?)`, [id, invoiceNumber, body.client_id, body.incident_id, body.contract_id,
            subtotal, taxRate, taxAmount, total, req.user?.userId]);
        for (const item of items) {
            await (0, pool_1.query)(`INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, transport_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, item.service_id, item.description, item.quantity, item.unit_price, item.transport_cost, item.line_total]);
        }
        const invoice = await (0, pool_1.queryOne)('SELECT * FROM invoices WHERE id = ?', [id]);
        res.status(201).json({ data: invoice });
    }
    catch (err) {
        next(err);
    }
});
exports.invoicesRouter.patch('/:id/status', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const { status } = zod_1.z.object({
            status: zod_1.z.enum(['draft', 'issued', 'sent', 'confirmed', 'paid', 'overdue', 'cancelled']),
        }).parse(req.body);
        const extra = {};
        if (status === 'sent')
            extra.sent_at = new Date().toISOString();
        if (status === 'paid')
            extra.paid_at = new Date().toISOString();
        await (0, pool_1.query)(`UPDATE invoices SET status = ?${extra.sent_at ? ', sent_at = ?' : ''}${extra.paid_at ? ', paid_at = ?' : ''} WHERE id = ?`, [status, ...(extra.sent_at ? [extra.sent_at] : []), ...(extra.paid_at ? [extra.paid_at] : []), req.params.id]);
        const invoice = await (0, pool_1.queryOne)('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        res.json({ data: invoice });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=invoices.js.map