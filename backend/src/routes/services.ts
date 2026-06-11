import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { Service } from '../models/types';

export const servicesRouter = Router();
servicesRouter.use(authenticate);

const serviceSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  coverage_type: z.enum(['contract', 'extra']).default('extra'),
  base_price: z.number().min(0),
  transport_price: z.number().min(0).default(0),
  unit: z.string().default('EUR'),
});

servicesRouter.get('/', async (req, res, next) => {
  try {
    const coverage = req.query.coverage_type as string | undefined;
    let where = 'WHERE is_active = 1';
    const params: unknown[] = [];
    if (coverage) { where += ' AND coverage_type = ?'; params.push(coverage); }

    const services = await query<Service>(
      `SELECT * FROM services ${where} ORDER BY code ASC`, params
    );
    res.json({ data: services });
  } catch (err) {
    next(err);
  }
});

servicesRouter.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const body = serviceSchema.parse(req.body);
    const id = uuidv4();

    await query(
      `INSERT INTO services (id, code, name, description, coverage_type, base_price, transport_price, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.code, body.name, body.description, body.coverage_type, body.base_price, body.transport_price, body.unit]
    );

    const service = await queryOne<Service>('SELECT * FROM services WHERE id = ?', [id]);
    res.status(201).json({ data: service });
  } catch (err) {
    next(err);
  }
});
