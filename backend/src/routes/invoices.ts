import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Invoice } from '../models/types';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

const invoiceItemSchema = z.object({
  service_id: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unit_price: z.number().min(0),
  transport_cost: z.number().min(0).default(0),
});

const createInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  incident_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax_rate: z.number().default(21),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

function generateInvoiceNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
}

invoicesRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string | undefined;
    const clientId = req.query.client_id as string | undefined;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (clientId) { where += ' AND client_id = ?'; params.push(clientId); }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM invoices ${where}`, params
    );

    const invoices = await query<Invoice>(
      `SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: invoices,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

/** POST /invoices — automātiska izveide no atgadījuma vai manuāli */
invoicesRouter.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const body = createInvoiceSchema.parse(req.body);
    const id = uuidv4();
    const invoiceNumber = generateInvoiceNumber();

    let subtotal = 0;
    const items = body.items.map((item) => {
      const lineTotal = item.quantity * item.unit_price + item.transport_cost;
      subtotal += lineTotal;
      return { ...item, line_total: lineTotal };
    });

    const taxAmount = subtotal * (body.tax_rate / 100);
    const total = subtotal + taxAmount;

    await query(
      `INSERT INTO invoices (id, invoice_number, client_id, incident_id, contract_id,
        status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, invoiceNumber, body.client_id, body.incident_id, body.contract_id,
        body.issue_date || new Date().toISOString().slice(0, 10),
        body.due_date, subtotal, body.tax_rate, taxAmount, total, body.notes,
        req.user?.userId,
      ]
    );

    for (const item of items) {
      await query(
        `INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, transport_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, item.service_id, item.description, item.quantity, item.unit_price, item.transport_cost, item.line_total]
      );
    }

    const invoice = await queryOne<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
});

/** POST /invoices/from-incident/:incidentId */
invoicesRouter.post('/from-incident/:incidentId', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const incident = await queryOne<{ client_id: string; contract_id: string | null }>(
      'SELECT client_id, contract_id FROM incidents WHERE id = ?',
      [req.params.incidentId]
    );
    if (!incident) throw new AppError(404, 'Incident not found');

    const incidentServices = await query<{
      service_id: string;
      quantity: number;
      unit_price: number;
      transport_cost: number;
      name: string;
    }>(
      `SELECT isv.*, s.name FROM incident_services isv
       JOIN services s ON isv.service_id = s.id
       WHERE isv.incident_id = ?`,
      [req.params.incidentId]
    );

    if (incidentServices.length === 0) {
      throw new AppError(400, 'Incident has no services attached');
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
    const id = uuidv4();
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

    await query(
      `INSERT INTO invoices (id, invoice_number, client_id, incident_id, contract_id,
        status, issue_date, subtotal, tax_rate, tax_amount, total, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', CURDATE(), ?, ?, ?, ?, ?)`,
      [id, invoiceNumber, body.client_id, body.incident_id, body.contract_id,
        subtotal, taxRate, taxAmount, total, req.user?.userId]
    );

    for (const item of items) {
      await query(
        `INSERT INTO invoice_items (id, invoice_id, service_id, description, quantity, unit_price, transport_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, item.service_id, item.description, item.quantity, item.unit_price, item.transport_cost, item.line_total]
      );
    }

    const invoice = await queryOne<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.patch('/:id/status', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['draft', 'issued', 'sent', 'confirmed', 'paid', 'overdue', 'cancelled']),
    }).parse(req.body);

    const extra: Record<string, unknown> = {};
    if (status === 'sent') extra.sent_at = new Date().toISOString();
    if (status === 'paid') extra.paid_at = new Date().toISOString();

    await query(
      `UPDATE invoices SET status = ?${extra.sent_at ? ', sent_at = ?' : ''}${extra.paid_at ? ', paid_at = ?' : ''} WHERE id = ?`,
      [status, ...(extra.sent_at ? [extra.sent_at] : []), ...(extra.paid_at ? [extra.paid_at] : []), req.params.id]
    );

    const invoice = await queryOne<Invoice>('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
});
