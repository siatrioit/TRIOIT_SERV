import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Contract } from '../models/types';

export const contractsRouter = Router();
contractsRouter.use(authenticate);

const contractSchema = z.object({
  client_id: z.string().uuid(),
  contract_number: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  start_date: z.string(),
  end_date: z.string().optional(),
  status: z.enum(['active', 'expired', 'renewable', 'draft', 'cancelled']).default('draft'),
  monthly_fee: z.number().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  document_url: z.string().url().optional(),
});

contractsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const clientId = req.query.client_id as string | undefined;
    const status = req.query.status as string | undefined;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    if (clientId) { where += ' AND client_id = ?'; params.push(clientId); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM contracts ${where}`, params
    );

    const contracts = await query<Contract>(
      `SELECT * FROM contracts ${where} ORDER BY start_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: contracts,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

contractsRouter.get('/:id', async (req, res, next) => {
  try {
    const contract = await queryOne<Contract>(
      'SELECT * FROM contracts WHERE id = ?', [req.params.id]
    );
    if (!contract) throw new AppError(404, 'Contract not found');
    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
});

contractsRouter.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const body = contractSchema.parse(req.body);
    const id = uuidv4();

    await query(
      `INSERT INTO contracts (id, client_id, contract_number, title, start_date, end_date,
        status, monthly_fee, terms, notes, document_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.client_id, body.contract_number, body.title, body.start_date,
        body.end_date, body.status, body.monthly_fee, body.terms, body.notes,
        body.document_url, req.user?.userId,
      ]
    );

    const contract = await queryOne<Contract>('SELECT * FROM contracts WHERE id = ?', [id]);
    res.status(201).json({ data: contract });
  } catch (err) {
    next(err);
  }
});

contractsRouter.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const body = contractSchema.partial().parse(req.body);
    const fields = Object.keys(body);
    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    await query(
      `UPDATE contracts SET ${setClause} WHERE id = ?`,
      [...fields.map((f) => (body as Record<string, unknown>)[f]), req.params.id]
    );

    const contract = await queryOne<Contract>('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
});
