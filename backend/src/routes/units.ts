import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Unit } from '../models/types';
import { deleteUnitForObject, type UnitRow } from '../services/units';
import { resolveAssetComponentId, resolveAssetTypeId } from '../services/assetTypes';

export const unitsRouter = Router();
unitsRouter.use(authenticate);

const unitBodySchema = z.object({
  client_id: z.string().uuid(),
  object_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  asset_type_id: z.string().uuid().optional(),
  unit_type: z.string().min(1).max(50).optional(),
  asset_component_id: z.string().uuid().nullable().optional(),
  serial_number: z.string().min(1).max(100),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  status: z.enum(['active', 'repair', 'decommissioned', 'spare']).default('active'),
  location_note: z.string().optional(),
  installed_at: z.string().optional(),
  notes: z.string().optional(),
});

const unitSchema = unitBodySchema.refine((data) => Boolean(data.asset_type_id || data.unit_type), {
  message: 'Norādiet aktīva tipu',
  path: ['asset_type_id'],
});

unitsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const clientId = req.query.client_id as string | undefined;
    const objectId = req.query.object_id as string | undefined;
    const serial = req.query.serial_number as string | undefined;
    const search = req.query.search as string | undefined;

    let where = 'WHERE c.is_active = 1';
    const params: unknown[] = [];
    if (clientId) { where += ' AND u.client_id = ?'; params.push(clientId); }
    if (objectId) { where += ' AND u.object_id = ?'; params.push(objectId); }
    if (serial) { where += ' AND u.serial_number LIKE ?'; params.push(`%${serial}%`); }
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      where += ` AND (
        u.serial_number LIKE ? OR u.model LIKE ? OR u.manufacturer LIKE ?
        OR c.name LIKE ? OR co.name LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       ${where}`,
      params
    );

    const units = await query<UnitRow>(
      `SELECT u.*, c.name AS client_name, co.name AS object_name,
              at.name AS asset_type_name, at.code AS asset_type_code,
              ac.name AS asset_component_name
       FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       ${where}
       ORDER BY c.name ASC, co.name ASC, u.serial_number ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: units,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

unitsRouter.get('/:id', async (req, res, next) => {
  try {
    const unit = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!unit) throw new AppError(404, 'Unit not found');
    res.json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitsRouter.post('/', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = unitSchema.parse(req.body);
    const assetType = await resolveAssetTypeId(body.asset_type_id, body.unit_type);
    const assetComponentId = await resolveAssetComponentId(
      body.asset_component_id,
      assetType.id
    );
    const id = uuidv4();

    await query(
      `INSERT INTO units (id, client_id, object_id, contract_id, unit_type, asset_type_id, asset_component_id,
        serial_number, model, manufacturer, status, location_note, installed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.client_id, body.object_id ?? null, body.contract_id,
        assetType.code, assetType.id, assetComponentId,
        body.serial_number, body.model, body.manufacturer, body.status, body.location_note,
        body.installed_at, body.notes,
      ]
    );

    const unit = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [id]);
    res.status(201).json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitsRouter.put('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = unitBodySchema.partial().parse(req.body);
    const existing = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError(404, 'Unit not found');

    const payload: Record<string, unknown> = { ...body };

    if (
      body.asset_type_id !== undefined ||
      body.unit_type !== undefined ||
      body.asset_component_id !== undefined
    ) {
      const assetType = await resolveAssetTypeId(
        body.asset_type_id ?? existing.asset_type_id ?? undefined,
        body.unit_type ?? existing.unit_type
      );
      payload.unit_type = assetType.code;
      payload.asset_type_id = assetType.id;
      payload.asset_component_id = await resolveAssetComponentId(
        body.asset_component_id !== undefined
          ? body.asset_component_id
          : existing.asset_component_id,
        assetType.id
      );
    }

    const fields = Object.keys(payload);
    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    await query(
      `UPDATE units SET ${setClause} WHERE id = ?`,
      [...fields.map((f) => (payload as Record<string, unknown>)[f]), req.params.id]
    );

    const unit = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [req.params.id]);
    res.json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitsRouter.delete('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const unit = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!unit) throw new AppError(404, 'Unit not found', 'NOT_FOUND');
    if (!unit.object_id) {
      throw new AppError(400, 'Aktīvam jābūt piesaistītam objektam', 'INVALID_UNIT');
    }
    await deleteUnitForObject(unit.client_id, unit.object_id, unit.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
