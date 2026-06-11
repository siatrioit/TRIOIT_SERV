import { v4 as uuidv4 } from 'uuid';
import type mysql from 'mysql2/promise';
import {
  query,
  queryOne,
  withMysqlTransaction,
  queryConn,
  queryOneConn,
} from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type { WarehouseItem, WarehouseMovement } from '../models/types';
import type {
  warehouseItemInputSchema,
  warehouseStockInSchema,
} from '../schemas/warehouse';
import type { z } from 'zod';

type ItemInput = z.infer<typeof warehouseItemInputSchema>;
type StockInInput = z.infer<typeof warehouseStockInSchema>;

export async function listWarehouseItems(search?: string): Promise<WarehouseItem[]> {
  let sql = 'SELECT * FROM warehouse_items WHERE is_active = 1';
  const params: unknown[] = [];
  if (search?.trim()) {
    sql += ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }
  sql += ' ORDER BY name ASC';
  return query<WarehouseItem>(sql, params);
}

export async function getWarehouseItem(id: string): Promise<WarehouseItem | null> {
  return queryOne<WarehouseItem>(
    'SELECT * FROM warehouse_items WHERE id = ? AND is_active = 1',
    [id]
  );
}

export async function createWarehouseItem(
  input: ItemInput,
  createdBy?: string
): Promise<WarehouseItem> {
  const id = uuidv4();
  await query(
    `INSERT INTO warehouse_items (id, sku, name, description, unit, min_quantity, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.sku ?? null,
      input.name.trim(),
      input.description ?? null,
      input.unit || 'gab',
      input.min_quantity ?? null,
      createdBy ?? null,
    ]
  );
  const item = await getWarehouseItem(id);
  if (!item) throw new AppError(500, 'Failed to create item');
  return item;
}

export async function updateWarehouseItem(
  id: string,
  input: Partial<ItemInput>
): Promise<WarehouseItem> {
  const existing = await getWarehouseItem(id);
  if (!existing) throw new AppError(404, 'Materiāls nav atrasts', 'NOT_FOUND');

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['sku', 'name', 'description', 'unit', 'min_quantity'] as const) {
    if (input[key] !== undefined) {
      fields.push(`${key} = ?`);
      const v = input[key];
      values.push(typeof v === 'string' ? v.trim() || null : v ?? null);
    }
  }
  if (fields.length === 0) return existing;

  await query(`UPDATE warehouse_items SET ${fields.join(', ')} WHERE id = ?`, [
    ...values,
    id,
  ]);
  const item = await getWarehouseItem(id);
  if (!item) throw new AppError(404, 'Materiāls nav atrasts');
  return item;
}

async function applyStockChange(
  conn: mysql.PoolConnection,
  itemId: string,
  delta: number,
  movementType: 'in' | 'out' | 'adjust',
  opts: {
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }
): Promise<number> {
  const item = await queryOneConn<{ quantity_on_hand: number }>(
    conn,
    'SELECT quantity_on_hand FROM warehouse_items WHERE id = ? AND is_active = 1 FOR UPDATE',
    [itemId]
  );
  if (!item) throw new AppError(404, 'Materiāls nav atrasts', 'NOT_FOUND');

  const after = Number(item.quantity_on_hand) + delta;
  if (after < 0) {
    throw new AppError(409, 'Nepietiekams atlikums noliktavā', 'INSUFFICIENT_STOCK');
  }

  await queryConn(conn, 'UPDATE warehouse_items SET quantity_on_hand = ? WHERE id = ?', [
    after,
    itemId,
  ]);

  const movementId = uuidv4();
  await queryConn(
    conn,
    `INSERT INTO warehouse_movements (
      id, item_id, movement_type, quantity, quantity_after,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movementId,
      itemId,
      movementType,
      Math.abs(delta),
      after,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
      opts.notes ?? null,
      opts.createdBy ?? null,
    ]
  );

  return after;
}

export async function stockIn(
  itemId: string,
  input: StockInInput,
  createdBy?: string
): Promise<WarehouseItem> {
  await withMysqlTransaction(async (conn) => {
    await applyStockChange(conn, itemId, input.quantity, 'in', {
      notes: input.notes,
      createdBy,
    });
  });
  const item = await getWarehouseItem(itemId);
  if (!item) throw new AppError(404, 'Materiāls nav atrasts');
  return item;
}

export async function consumeStock(
  itemId: string,
  quantity: number,
  referenceType: string,
  referenceId: string,
  createdBy?: string,
  notes?: string
): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await applyStockChange(conn, itemId, -quantity, 'out', {
      referenceType,
      referenceId,
      notes,
      createdBy,
    });
  });
}

export async function returnStock(
  itemId: string,
  quantity: number,
  referenceType: string,
  referenceId: string,
  createdBy?: string
): Promise<void> {
  await withMysqlTransaction(async (conn) => {
    await applyStockChange(conn, itemId, quantity, 'in', {
      referenceType,
      referenceId,
      notes: 'Atgriezts no atgadījuma',
      createdBy,
    });
  });
}

export async function listMovements(itemId: string, limit = 20): Promise<WarehouseMovement[]> {
  return query<WarehouseMovement>(
    `SELECT * FROM warehouse_movements WHERE item_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [itemId, limit]
  );
}
