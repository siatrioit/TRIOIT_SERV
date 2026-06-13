import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Unit } from '../models/types';
import {
  createUnitForObject,
  deleteUnitForObject,
  type UnitRow,
  updateUnitForObject,
} from '../services/units';
import { listUnitActivity, resolveStaffActorName } from '../services/unitActivity';
import { unitUpdateSchema } from '../schemas/unit';

export const unitsRouter = Router();
unitsRouter.use(authenticate);

async function actorFromReq(req: Express.Request) {
  const user = (req as Express.Request & { user?: { userId: string } }).user;
  if (!user) return null;
  return {
    userId: user.userId,
    userName: await resolveStaffActorName(user.userId),
  };
}

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
        OR c.name LIKE ? OR co.name LIKE ? OR ac.name LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       ${where}`,
      params
    );

    const units = await query<UnitRow>(
      `SELECT u.*, c.name AS client_name, co.name AS object_name,
              at.name AS asset_type_name, at.code AS asset_type_code,
              ac.name AS asset_component_name,
              pu.serial_number AS parent_serial_number
       FROM units u
       JOIN clients c ON c.id = u.client_id
       LEFT JOIN client_objects co ON co.id = u.object_id
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       LEFT JOIN units pu ON pu.id = u.parent_unit_id
       ${where}
       ORDER BY
         c.name ASC,
         co.name ASC,
         CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
         COALESCE(pu.serial_number, u.serial_number) ASC,
         u.serial_number ASC
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

unitsRouter.get('/:id/activity', async (req, res, next) => {
  try {
    const unit = await queryOne<Unit>('SELECT id FROM units WHERE id = ?', [req.params.id]);
    if (!unit) throw new AppError(404, 'Unit not found');
    const activity = await listUnitActivity(req.params.id);
    res.json({ data: activity });
  } catch (err) {
    next(err);
  }
});

unitsRouter.get('/:id', async (req, res, next) => {
  try {
    const unit = await queryOne<UnitRow>(
      `SELECT u.*, at.name AS asset_type_name, ac.name AS asset_component_name,
              pu.serial_number AS parent_serial_number
       FROM units u
       LEFT JOIN asset_types at ON at.id = u.asset_type_id
       LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
       LEFT JOIN units pu ON pu.id = u.parent_unit_id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!unit) throw new AppError(404, 'Unit not found');
    res.json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitsRouter.put('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = unitUpdateSchema.parse(req.body);
    const existing = await queryOne<Unit>('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError(404, 'Unit not found');
    if (!existing.object_id) {
      throw new AppError(400, 'Aktīvam jābūt piesaistītam objektam', 'INVALID_UNIT');
    }

    const actor = await actorFromReq(req);
    const unit = await updateUnitForObject(
      existing.client_id,
      existing.object_id,
      req.params.id,
      body,
      actor
    );
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
    const actor = await actorFromReq(req);
    await deleteUnitForObject(unit.client_id, unit.object_id, unit.id, actor);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
