import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { IncidentMaterial, IncidentWorkLog } from '../models/types';
import type { incidentMaterialInputSchema, workLogInputSchema } from '../schemas/warehouse';
import { consumeStock, returnStock } from './warehouse';
import type { z } from 'zod';

type WorkLogInput = z.infer<typeof workLogInputSchema>;
type MaterialInput = z.infer<typeof incidentMaterialInputSchema>;

async function assertIncidentEditable(incidentId: string): Promise<void> {
  const row = await queryOne<{ status: string }>(
    'SELECT status FROM incidents WHERE id = ?',
    [incidentId]
  );
  if (!row) throw new AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
  if (row.status === 'completed' || row.status === 'cancelled') {
    throw new AppError(409, 'Atgadījums ir slēgts — labot nevar', 'INCIDENT_CLOSED');
  }
}

export async function listWorkLogs(incidentId: string): Promise<IncidentWorkLog[]> {
  return query<IncidentWorkLog>(
    `SELECT w.*, u.full_name AS user_name
     FROM incident_work_logs w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.incident_id = ?
     ORDER BY w.work_date DESC, w.created_at DESC`,
    [incidentId]
  );
}

export async function addWorkLog(
  incidentId: string,
  input: WorkLogInput,
  createdBy: string
): Promise<IncidentWorkLog> {
  await assertIncidentEditable(incidentId);
  const id = uuidv4();
  const userId = input.user_id ?? createdBy;
  await query(
    `INSERT INTO incident_work_logs (
      id, incident_id, user_id, work_date, duration_minutes, description, work_type, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      incidentId,
      userId,
      input.work_date,
      input.duration_minutes,
      input.description.trim(),
      input.work_type ?? null,
      createdBy,
    ]
  );
  const row = await queryOne<IncidentWorkLog>(
    `SELECT w.*, u.full_name AS user_name
     FROM incident_work_logs w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.id = ?`,
    [id]
  );
  if (!row) throw new AppError(500, 'Failed to create work log');
  return row;
}

export async function deleteWorkLog(incidentId: string, workLogId: string): Promise<void> {
  await assertIncidentEditable(incidentId);
  const row = await queryOne('SELECT id FROM incident_work_logs WHERE id = ? AND incident_id = ?', [
    workLogId,
    incidentId,
  ]);
  if (!row) throw new AppError(404, 'Darba ieraksts nav atrasts', 'NOT_FOUND');
  await query('DELETE FROM incident_work_logs WHERE id = ?', [workLogId]);
}

export async function listIncidentMaterials(incidentId: string): Promise<IncidentMaterial[]> {
  return query<IncidentMaterial>(
    `SELECT m.*, wi.name AS item_name, wi.unit AS item_unit, wi.sku AS item_sku,
            u.full_name AS used_by_name
     FROM incident_materials m
     JOIN warehouse_items wi ON wi.id = m.warehouse_item_id
     LEFT JOIN users u ON u.id = m.used_by
     WHERE m.incident_id = ?
     ORDER BY m.used_at DESC`,
    [incidentId]
  );
}

export async function addIncidentMaterial(
  incidentId: string,
  input: MaterialInput,
  usedBy: string
): Promise<IncidentMaterial> {
  await assertIncidentEditable(incidentId);
  const id = uuidv4();

  await consumeStock(
    input.warehouse_item_id,
    input.quantity,
    'incident',
    id,
    usedBy,
    input.notes
  );

  try {
    await query(
      `INSERT INTO incident_materials (
        id, incident_id, warehouse_item_id, quantity, notes, used_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        incidentId,
        input.warehouse_item_id,
        input.quantity,
        input.notes ?? null,
        usedBy,
      ]
    );
  } catch (err) {
    await returnStock(input.warehouse_item_id, input.quantity, 'incident', id, usedBy);
    throw err;
  }

  const row = await queryOne<IncidentMaterial>(
    `SELECT m.*, wi.name AS item_name, wi.unit AS item_unit, wi.sku AS item_sku,
            u.full_name AS used_by_name
     FROM incident_materials m
     JOIN warehouse_items wi ON wi.id = m.warehouse_item_id
     LEFT JOIN users u ON u.id = m.used_by
     WHERE m.id = ?`,
    [id]
  );
  if (!row) throw new AppError(500, 'Failed to record material');
  return row;
}

export async function deleteIncidentMaterial(
  incidentId: string,
  materialId: string
): Promise<void> {
  await assertIncidentEditable(incidentId);
  const row = await queryOne<IncidentMaterial>(
    'SELECT * FROM incident_materials WHERE id = ? AND incident_id = ?',
    [materialId, incidentId]
  );
  if (!row) throw new AppError(404, 'Materiāla ieraksts nav atrasts', 'NOT_FOUND');

  await returnStock(
    row.warehouse_item_id,
    Number(row.quantity),
    'incident',
    materialId,
    row.used_by ?? undefined
  );
  await query('DELETE FROM incident_materials WHERE id = ?', [materialId]);
}

export async function getWorkSummary(incidentId: string): Promise<{
  total_minutes: number;
  material_lines: number;
}> {
  const work = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM incident_work_logs WHERE incident_id = ?',
    [incidentId]
  );
  const mats = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM incident_materials WHERE incident_id = ?',
    [incidentId]
  );
  return {
    total_minutes: Number(work?.total ?? 0),
    material_lines: Number(mats?.total ?? 0),
  };
}
