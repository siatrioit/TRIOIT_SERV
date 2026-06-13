import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../../db/pool';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import {
  assertCanCreateIncident,
  assertCanViewIncident,
  assertCanAccessObject,
  buildIncidentScopeClause,
} from '../../services/portalScope';
import {
  addPortalMessage,
  listIncidentMessagesWithReadState,
  markIncidentRead,
} from '../../services/incidentMessages';
import { assertUnitForIncident } from '../../services/units';
import { resolveIncidentAssignee } from '../../services/incidentAssignment';
import { resolveAssetComponentId } from '../../services/assetTypes';
import { firePush, notifyNewIncident, notifyPortalChatMessage } from '../../services/pushNotifications';

export const portalIncidentsRouter = Router();

const createSchema = z.object({
  client_id: z.string().uuid(),
  object_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  asset_component_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

function generateIncidentNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INC-${date}-${rand}`;
}

type PortalIncidentRow = {
  id: string;
  incident_number: string;
  client_id: string;
  object_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  received_at: string;
  completed_at: string | null;
  resolution: string | null;
  client_name: string;
  object_name: string | null;
  unit_id?: string | null;
  unit_serial?: string | null;
  unit_type?: string | null;
  unit_model?: string | null;
  asset_component_name?: string | null;
  unread_count?: number;
};

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

portalIncidentsRouter.get('/', async (req, res, next) => {
  try {
    const { access, portalUserId } = req.portalUser!;
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string | undefined;
    const objectId = req.query.object_id as string | undefined;

    if (objectId) {
      await assertCanAccessObject(access, objectId);
    }

    const { clause, params } = await buildIncidentScopeClause(access);
    let where = `WHERE ${clause}`;
    const queryParams = [...params];

    if (objectId) {
      where += ' AND i.object_id = ?';
      queryParams.push(objectId);
    }

    if (status === 'open') {
      where += " AND i.status IN ('pending', 'in_progress', 'paused')";
    } else if (status === 'closed') {
      where += " AND i.status IN ('completed', 'cancelled')";
    } else if (status) {
      where += ' AND i.status = ?';
      queryParams.push(status);
    }

    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       ${where}`,
      queryParams
    );

    const incidents = await query<PortalIncidentRow>(
      `SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name,
              (SELECT COUNT(*) FROM incident_messages m
               WHERE m.incident_id = i.id AND m.author_type = 'staff'
               AND m.created_at > GREATEST(
                 COALESCE(r.last_read_at, '1970-01-01 00:00:00'),
                 COALESCE(pm.last_at, '1970-01-01 00:00:00')
               )) AS unread_count
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       LEFT JOIN incident_message_reads r
         ON r.incident_id = i.id AND r.reader_type = 'portal' AND r.reader_id = ?
       LEFT JOIN (
         SELECT incident_id, MAX(created_at) AS last_at
         FROM incident_messages
         WHERE author_type = 'portal' AND author_portal_id = ?
         GROUP BY incident_id
       ) pm ON pm.incident_id = i.id
       ${where}
       ORDER BY i.received_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, portalUserId, portalUserId, limit, offset]
    );

    res.json({
      data: incidents,
      pagination: buildPaginationMeta(countRow?.total ?? 0, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

portalIncidentsRouter.get('/:id', async (req, res, next) => {
  try {
    const { access } = req.portalUser!;
    await assertCanViewIncident(access, req.params.id);

    const incident = await queryOne<PortalIncidentRow>(
      `SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!incident) throw new AppError(404, 'Izsaukums nav atrasts', 'NOT_FOUND');
    res.json({ data: incident });
  } catch (err) {
    next(err);
  }
});

portalIncidentsRouter.post('/', async (req, res, next) => {
  try {
    const { portalUserId, access } = req.portalUser!;
    const body = createSchema.parse(req.body);

    await assertCanCreateIncident(access, body.client_id, body.object_id);

    if (body.unit_id) {
      await assertUnitForIncident(body.unit_id, body.client_id, body.object_id);
    }

    const reporter = await queryOne<{ full_name: string }>(
      'SELECT full_name FROM portal_users WHERE id = ?',
      [portalUserId]
    );

    const id = uuidv4();
    const incidentNumber = generateIncidentNumber();
    const assignedTo = await resolveIncidentAssignee(body.object_id);

    let assetComponentId: string | null = null;
    if (body.asset_component_id) {
      if (!body.unit_id) {
        throw new AppError(400, 'Apakšsadaļu var norādīt tikai ar izvēlētu aktīvu', 'INVALID_ASSET_COMPONENT');
      }
      const unitRow = await queryOne<{ asset_type_id: string | null }>(
        'SELECT asset_type_id FROM units WHERE id = ?',
        [body.unit_id]
      );
      if (!unitRow?.asset_type_id) {
        throw new AppError(400, 'Apakšsadaļa nav derīga', 'INVALID_ASSET_COMPONENT');
      }
      assetComponentId = await resolveAssetComponentId(body.asset_component_id, unitRow.asset_type_id);
    }

    await query(
      `INSERT INTO incidents (
        id, incident_number, client_id, object_id, unit_id, asset_component_id, reported_by, reported_via,
        title, description, status, priority, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'portal', ?, ?, 'pending', ?, ?)`,
      [
        id,
        incidentNumber,
        body.client_id,
        body.object_id,
        body.unit_id ?? null,
        assetComponentId,
        reporter?.full_name ?? 'Klienta portāls',
        body.title,
        body.description ?? null,
        body.priority,
        assignedTo,
      ]
    );

    const incident = await queryOne<PortalIncidentRow>(
      `SELECT i.id, i.incident_number, i.client_id, i.object_id, i.title, i.description,
              i.status, i.priority, i.received_at, i.completed_at, i.resolution,
              c.name AS client_name, co.name AS object_name,
              u.id AS unit_id, u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
              ac.name AS asset_component_name
       FROM incidents i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN client_objects co ON co.id = i.object_id
       LEFT JOIN units u ON u.id = i.unit_id
       LEFT JOIN asset_type_components ac ON ac.id = i.asset_component_id
       WHERE i.id = ?`,
      [id]
    );

    firePush(() =>
      notifyNewIncident({
        incidentId: id,
        incidentNumber,
        title: body.title,
        objectName: incident?.object_name,
        assignedTo,
      })
    );

    res.status(201).json({ data: incident });
  } catch (err) {
    next(err);
  }
});

portalIncidentsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const { portalUserId, access } = req.portalUser!;
    await assertCanViewIncident(access, req.params.id);
    const messages = await listIncidentMessagesWithReadState(
      req.params.id,
      'portal',
      portalUserId
    );
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
});

portalIncidentsRouter.post('/:id/messages', async (req, res, next) => {
  try {
    const { portalUserId, access } = req.portalUser!;
    const { body } = messageSchema.parse(req.body);
    const message = await addPortalMessage(req.params.id, portalUserId, access, body);

    const incident = await queryOne<{
      incident_number: string;
      assigned_to: string | null;
    }>(
      'SELECT incident_number, assigned_to FROM incidents WHERE id = ?',
      [req.params.id]
    );

    if (incident) {
      firePush(() =>
        notifyPortalChatMessage({
          incidentId: req.params.id,
          incidentNumber: incident.incident_number,
          authorName: message.author_name,
          messagePreview: message.body,
          assignedTo: incident.assigned_to,
        })
      );
    }

    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
});

portalIncidentsRouter.post('/:id/read', async (req, res, next) => {
  try {
    const { portalUserId, access } = req.portalUser!;
    await assertCanViewIncident(access, req.params.id);
    await markIncidentRead(req.params.id, 'portal', portalUserId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
