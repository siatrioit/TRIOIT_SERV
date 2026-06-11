import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Client } from '../models/types';

export const clientsRouter = Router();
clientsRouter.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1).max(255),
  client_type: z.enum(['company', 'private']).default('company'),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().length(2).default('LV'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  representative: z.string().optional(),
  notes: z.string().optional(),
});

/** GET /clients — saraksts ar filtriem */
clientsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const search = req.query.search as string | undefined;
    const city = req.query.city as string | undefined;

    let where = 'WHERE is_active = 1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (city) {
      where += ' AND city = ?';
      params.push(city);
    }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM clients ${where}`,
      params
    );
    const total = countRow?.total ?? 0;

    const clients = await query<Client>(
      `SELECT * FROM clients ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: clients,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /clients/:id */
clientsRouter.get('/:id', async (req, res, next) => {
  try {
    const client = await queryOne<Client>(
      'SELECT * FROM clients WHERE id = ?',
      [req.params.id]
    );
    if (!client) throw new AppError(404, 'Client not found', 'NOT_FOUND');
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

/** POST /clients */
clientsRouter.post('/', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = clientSchema.parse(req.body);
    const id = uuidv4();

    await query(
      `INSERT INTO clients (id, name, client_type, address, city, postal_code, country,
        latitude, longitude, phone, email, representative, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.name, body.client_type, body.address, body.city, body.postal_code,
        body.country, body.latitude, body.longitude, body.phone,
        body.email || null, body.representative, body.notes, req.user?.userId,
      ]
    );

    const client = await queryOne<Client>('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json({ data: client });
  } catch (err) {
    next(err);
  }
});

/** PUT /clients/:id */
clientsRouter.put('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = clientSchema.partial().parse(req.body);
    const existing = await queryOne('SELECT id FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError(404, 'Client not found');

    const fields = Object.keys(body);
    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    await query(
      `UPDATE clients SET ${setClause} WHERE id = ?`,
      [...fields.map((f) => (body as Record<string, unknown>)[f]), req.params.id]
    );

    const client = await queryOne<Client>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

/** DELETE /clients/:id — soft delete */
clientsRouter.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE clients SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
