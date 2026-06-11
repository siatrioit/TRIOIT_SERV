import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Incident } from '../models/types';

export const incidentsRouter = Router();
incidentsRouter.use(authenticate);

const incidentSchema = z.object({
  client_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  reported_by: z.string().optional(),
  reported_via: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  due_at: z.string().optional(),
  resolution: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  voice_transcript: z.string().optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  ai_metadata: z.record(z.string(), z.unknown()).optional(),
});

function generateIncidentNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INC-${date}-${rand}`;
}

/** GET /incidents — ar filtriem: status, priority, city, assigned_to */
incidentsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const city = req.query.city as string | undefined;
    const assignedTo = req.query.assigned_to as string | undefined;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let join = '';

    if (city) {
      join = ' JOIN clients c ON incidents.client_id = c.id';
      where += ' AND c.city = ?';
      params.push(city);
    }
    if (status) { where += ' AND incidents.status = ?'; params.push(status); }
    if (priority) { where += ' AND incidents.priority = ?'; params.push(priority); }
    if (assignedTo) { where += ' AND incidents.assigned_to = ?'; params.push(assignedTo); }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM incidents${join} ${where}`, params
    );

    const staffUserId = req.user!.userId;

    const incidents = await query<Incident & { unread_count?: number }>(
      `SELECT incidents.*,
        (SELECT COUNT(*) FROM incident_messages m
         WHERE m.incident_id = incidents.id AND m.author_type = 'portal'
         AND m.created_at > COALESCE(
           (SELECT r.last_read_at FROM incident_message_reads r
            WHERE r.incident_id = incidents.id AND r.reader_type = 'staff' AND r.reader_id = ?),
           '1970-01-01 00:00:00'
         )) AS unread_count
       FROM incidents${join} ${where}
       ORDER BY incidents.received_at DESC LIMIT ? OFFSET ?`,
      [...params, staffUserId, limit, offset]
    );

    res.json({
      data: incidents,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.get('/:id', async (req, res, next) => {
  try {
    const incident = await queryOne<Incident>(
      'SELECT * FROM incidents WHERE id = ?', [req.params.id]
    );
    if (!incident) throw new AppError(404, 'Incident not found');
    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.post('/', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = incidentSchema.parse(req.body);
    const id = uuidv4();
    const incidentNumber = generateIncidentNumber();

    await query(
      `INSERT INTO incidents (id, incident_number, client_id, unit_id, contract_id,
        reported_by, reported_via, title, description, status, priority, due_at,
        assigned_to, latitude, longitude, voice_transcript, ai_confidence, ai_metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, incidentNumber, body.client_id, body.unit_id, body.contract_id,
        body.reported_by, body.reported_via || 'web', body.title, body.description,
        body.status, body.priority, body.due_at, body.assigned_to,
        body.latitude, body.longitude, body.voice_transcript,
        body.ai_confidence, body.ai_metadata ? JSON.stringify(body.ai_metadata) : null,
        req.user?.userId,
      ]
    );

    const incident = await queryOne<Incident>('SELECT * FROM incidents WHERE id = ?', [id]);
    res.status(201).json({ data: incident });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.patch('/:id/status', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const { status, resolution } = z.object({
      status: z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']),
      resolution: z.string().optional(),
    }).parse(req.body);

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await query(
      'UPDATE incidents SET status = ?, resolution = ?, completed_at = ? WHERE id = ?',
      [status, resolution, completedAt, req.params.id]
    );

    const incident = await queryOne<Incident>('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});
