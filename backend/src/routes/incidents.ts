import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { query, queryOne } from '../db/pool';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import type { Incident } from '../models/types';
import { resolveIncidentLocation } from '../services/incidentLocation';
import { resolveIncidentAssignee, assertAssignableUser } from '../services/incidentAssignment';
import { addStaffMessage, countUnreadForStaff } from '../services/incidentMessages';
import {
  firePush,
  notifyIncidentReassigned,
  notifyNewIncident,
} from '../services/pushNotifications';
import { resolveAssetComponentId } from '../services/assetTypes';
import {
  assertValidIncidentStatus,
  getDefaultIncidentStatusCode,
  sqlInActiveStatusCodes,
} from '../services/incidentStatuses';
import { resolveStaffActorName } from '../services/unitActivity';
import { syncUnitStatusFromIncident } from '../services/unitStatusSync';
import {
  listIncidentActivity,
  logIncidentAssigned,
  logIncidentCreated,
  logIncidentStatusChanged,
} from '../services/incidentActivity';
import { isClosedIncidentStatus } from '../services/incidentStatuses';
import {
  generateCompletionActPdf,
  getCompletionAct,
  getCompletionActPdfPath,
  requestCompletionSignature,
  signCompletionAct,
} from '../services/incidentCompletion';
import fs from 'fs';

export const incidentsRouter = Router();
incidentsRouter.use(authenticate);

async function actorFromReq(req: Express.Request) {
  const user = (req as Express.Request & { user?: { userId: string } }).user;
  if (!user) return null;
  return {
    userId: user.userId,
    userName: await resolveStaffActorName(user.userId),
  };
}

const incidentSchema = z.object({
  client_id: z.string().uuid(),
  object_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  reported_by: z.string().optional(),
  reported_via: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  due_at: z.string().optional(),
  resolution: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  asset_component_id: z.string().uuid().optional().nullable(),
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
    const unitId = req.query.unit_id as string | undefined;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (city) {
      where += ' AND c.city = ?';
      params.push(city);
    }
    if (unitId) {
      where += ' AND i.unit_id = ?';
      params.push(unitId);
    }
    if (status === 'open') {
      const open = await sqlInActiveStatusCodes('open');
      where += ` AND i.status IN (${open.fragment})`;
      params.push(...open.codes);
    } else if (status === 'closed') {
      const closed = await sqlInActiveStatusCodes('closed');
      where += ` AND i.status IN (${closed.fragment})`;
      params.push(...closed.codes);
    } else if (status) {
      where += ' AND i.status = ?';
      params.push(status);
    }
    if (priority) {
      where += ' AND i.priority = ?';
      params.push(priority);
    }
    if (assignedTo) {
      where += ' AND i.assigned_to = ?';
      params.push(assignedTo);
    }

    const fromClause = `
      FROM incidents i
      JOIN clients c ON c.id = i.client_id
      LEFT JOIN client_objects co ON co.id = i.object_id
      LEFT JOIN users au ON au.id = i.assigned_to
      LEFT JOIN units u ON u.id = i.unit_id
      LEFT JOIN asset_types at ON at.id = u.asset_type_id
      LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id`;

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total ${fromClause} ${where}`,
      params
    );

    const staffUserId = req.user!.userId;

    const rows = await query<
      Incident & {
        client_name?: string;
        object_name?: string | null;
        unit_serial?: string | null;
        unit_type?: string | null;
        unit_model?: string | null;
        asset_type_name?: string | null;
        asset_component_name?: string | null;
      }
    >(
      `SELECT i.*,
              c.name AS client_name,
              co.name AS object_name,
              au.full_name AS assigned_user_name,
              u.serial_number AS unit_serial,
              u.unit_type,
              u.model AS unit_model,
              at.name AS asset_type_name,
              ac.name AS asset_component_name
       ${fromClause}
       ${where}
       ORDER BY i.received_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const incidents = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        unread_count: await countUnreadForStaff(row.id, staffUserId),
      }))
    );

    res.json({
      data: incidents,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.get('/:id/activity', async (req, res, next) => {
  try {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM incidents WHERE id = ?',
      [req.params.id]
    );
    if (!existing) throw new AppError(404, 'Incident not found');

    const entries = await listIncidentActivity(req.params.id);
    res.json({ data: entries });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.get('/:id/completion', async (req, res, next) => {
  try {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM incidents WHERE id = ?',
      [req.params.id]
    );
    if (!existing) throw new AppError(404, 'Incident not found');
    const data = await getCompletionAct(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.post(
  '/:id/completion/request',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const data = await requestCompletionSignature(req.params.id, req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

incidentsRouter.post(
  '/:id/completion/sign',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          signer_name: z.string().min(1).max(255),
          signature_type: z.enum(['typed', 'drawn']),
          signature_data: z.string().min(1),
        })
        .parse(req.body);
      const data = await signCompletionAct({
        incidentId: req.params.id,
        signerName: body.signer_name,
        signatureType: body.signature_type,
        signatureData: body.signature_data,
        staffUserId: req.user!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

incidentsRouter.post(
  '/:id/completion/generate-act',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const data = await generateCompletionActPdf(req.params.id, req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

incidentsRouter.get('/:id/completion/act.pdf', async (req, res, next) => {
  try {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM incidents WHERE id = ?',
      [req.params.id]
    );
    if (!existing) throw new AppError(404, 'Incident not found');
    const { path: pdfPath, filename } = await getCompletionActPdfPath(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

incidentsRouter.get('/:id', async (req, res, next) => {
  try {
    const incident = await queryOne<
      Incident & {
        object_name?: string | null;
        unit_serial?: string | null;
        unit_type?: string | null;
        unit_model?: string | null;
      }
    >(
      `SELECT i.*, co.name AS object_name,
              au.full_name AS assigned_user_name,
              u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`,
      [req.params.id]
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
    const statusCode = body.status ?? (await getDefaultIncidentStatusCode());
    await assertValidIncidentStatus(statusCode);
    const location = await resolveIncidentLocation(body);
    const assignedTo = await resolveIncidentAssignee(location.object_id, body.assigned_to);

    let assetComponentId: string | null = null;
    if (body.asset_component_id) {
      const unitRow = location.unit_id
        ? await queryOne<{ asset_type_id: string | null }>(
            'SELECT asset_type_id FROM units WHERE id = ?',
            [location.unit_id]
          )
        : null;
      if (!unitRow?.asset_type_id) {
        throw new AppError(400, 'Apakšsadaļu var norādīt tikai ar izvēlētu aktīvu', 'INVALID_ASSET_COMPONENT');
      }
      assetComponentId = await resolveAssetComponentId(body.asset_component_id, unitRow.asset_type_id);
    }

    const id = uuidv4();
    const incidentNumber = generateIncidentNumber();

    await query(
      `INSERT INTO incidents (id, incident_number, client_id, object_id, unit_id, asset_component_id, contract_id,
        reported_by, reported_via, title, description, status, priority, due_at,
        assigned_to, latitude, longitude, voice_transcript, ai_confidence, ai_metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, incidentNumber, location.client_id, location.object_id, location.unit_id,
        assetComponentId,
        body.contract_id ?? null,
        body.reported_by ?? null, body.reported_via || 'web', body.title, body.description ?? null,
        statusCode, body.priority, body.due_at ?? null, assignedTo,
        body.latitude ?? null, body.longitude ?? null, body.voice_transcript ?? null,
        body.ai_confidence ?? null, body.ai_metadata ? JSON.stringify(body.ai_metadata) : null,
        req.user?.userId ?? null,
      ]
    );

    const incident = await queryOne<
      Incident & { object_name?: string | null }
    >(
      `SELECT i.*, co.name AS object_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       WHERE i.id = ?`,
      [id]
    );

    if (location.unit_id && location.object_id) {
      await syncUnitStatusFromIncident(
        {
          unitId: location.unit_id,
          clientId: location.client_id,
          objectId: location.object_id,
          incidentId: id,
          incidentStatus: statusCode,
        },
        await actorFromReq(req)
      );
    }

    await logIncidentCreated(id, statusCode, await actorFromReq(req));

    firePush(() =>
      notifyNewIncident({
        incidentId: id,
        incidentNumber,
        title: body.title,
        objectName: incident?.object_name,
        assignedTo,
        excludeUserId: req.user?.userId ?? null,
      })
    );

    res.status(201).json({ data: incident });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.patch('/:id/assign', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const { assigned_to: assignedTo } = z.object({
      assigned_to: z.string().uuid(),
    }).parse(req.body);

    const existing = await queryOne<{ id: string; assigned_to: string | null }>(
      'SELECT id, assigned_to FROM incidents WHERE id = ?',
      [req.params.id]
    );
    if (!existing) throw new AppError(404, 'Incident not found');

    const assignee = await assertAssignableUser(assignedTo);
    if (existing.assigned_to === assignee.id) {
      const incident = await queryOne<
        Incident & { object_name?: string | null; assigned_user_name?: string | null }
      >(
        `SELECT i.*, co.name AS object_name, au.full_name AS assigned_user_name
         FROM incidents i
         LEFT JOIN client_objects co ON co.id = i.object_id
         LEFT JOIN users au ON au.id = i.assigned_to
         WHERE i.id = ?`,
        [req.params.id]
      );
      return res.json({ data: incident });
    }

    await query('UPDATE incidents SET assigned_to = ? WHERE id = ?', [assignee.id, req.params.id]);

    const staffUserId = req.user!.userId;
    const actor = await actorFromReq(req);
    await logIncidentAssigned(req.params.id, assignee.full_name, actor);

    await addStaffMessage(
      req.params.id,
      staffUserId,
      `Izsaukums pārvirzīts lietotājam ${assignee.full_name}.`
    );

    const incident = await queryOne<
      Incident & { object_name?: string | null; assigned_user_name?: string | null }
    >(
      `SELECT i.*, co.name AS object_name, au.full_name AS assigned_user_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       WHERE i.id = ?`,
      [req.params.id]
    );

    firePush(() =>
      notifyIncidentReassigned({
        incidentId: req.params.id,
        incidentNumber: incident!.incident_number,
        title: incident!.title,
        assigneeId: assignee.id,
        excludeUserId: staffUserId,
      })
    );

    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.patch('/:id', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = z
      .object({
        asset_component_id: z.string().uuid().nullable().optional(),
      })
      .parse(req.body);

    const existing = await queryOne<{ id: string; unit_id: string | null }>(
      'SELECT id, unit_id FROM incidents WHERE id = ?',
      [req.params.id]
    );
    if (!existing) throw new AppError(404, 'Incident not found');

    if (body.asset_component_id === undefined) {
      throw new AppError(400, 'Nav ko atjaunināt', 'NO_FIELDS');
    }

    let assetComponentId: string | null = null;
    if (body.asset_component_id) {
      const unitRow = existing.unit_id
        ? await queryOne<{ asset_type_id: string | null }>(
            'SELECT asset_type_id FROM units WHERE id = ?',
            [existing.unit_id]
          )
        : null;
      if (!unitRow?.asset_type_id) {
        throw new AppError(400, 'Apakšsadaļu var norādīt tikai ar piesaistītu aktīvu', 'INVALID_ASSET_COMPONENT');
      }
      assetComponentId = await resolveAssetComponentId(body.asset_component_id, unitRow.asset_type_id);
    }

    await query('UPDATE incidents SET asset_component_id = ? WHERE id = ?', [
      assetComponentId,
      req.params.id,
    ]);

    const incident = await queryOne<
      Incident & {
        object_name?: string | null;
        unit_serial?: string | null;
        unit_type?: string | null;
        unit_model?: string | null;
        asset_component_name?: string | null;
      }
    >(
      `SELECT i.*, co.name AS object_name,
              au.full_name AS assigned_user_name,
              u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN users au ON au.id = i.assigned_to
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`,
      [req.params.id]
    );

    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});

incidentsRouter.patch('/:id/status', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const { status, resolution } = z
      .object({
        status: z.string(),
        resolution: z.string().optional(),
      })
      .parse(req.body);

    await assertValidIncidentStatus(status);

    const existing = await queryOne<{
      id: string;
      unit_id: string | null;
      client_id: string;
      object_id: string | null;
      status: string;
    }>('SELECT id, unit_id, client_id, object_id, status FROM incidents WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError(404, 'Incident not found');

    const closed = await isClosedIncidentStatus(status);
    const resolutionValue = resolution?.trim() || null;

    if (closed && !resolutionValue) {
      throw new AppError(400, 'Noslēdzot atgadījumu, norādiet risinājumu', 'RESOLUTION_REQUIRED');
    }

    const completedAt = closed ? new Date().toISOString() : null;
    const finalResolution = closed ? resolutionValue : null;

    await query(
      'UPDATE incidents SET status = ?, resolution = ?, completed_at = ? WHERE id = ?',
      [status, finalResolution, completedAt, req.params.id]
    );

    if (existing.status !== status) {
      await logIncidentStatusChanged(
        req.params.id,
        existing.status,
        status,
        await actorFromReq(req),
        resolutionValue
      );
    }

    if (existing.unit_id && existing.object_id) {
      await syncUnitStatusFromIncident(
        {
          unitId: existing.unit_id,
          clientId: existing.client_id,
          objectId: existing.object_id,
          incidentId: existing.id,
          incidentStatus: status,
        },
        await actorFromReq(req)
      );
    }

    const incident = await queryOne<Incident>('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});
