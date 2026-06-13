import { v4 as uuidv4 } from 'uuid';
import type mysql from 'mysql2/promise';
import {
  query,
  queryOne,
  queryConn,
  queryOneConn,
  withMysqlTransaction,
} from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import type {
  productGroupInputSchema,
  productInputSchema,
  receiptInputSchema,
  issueInputSchema,
} from '../schemas/warehouseCommercial';
import type { z } from 'zod';

type GroupInput = z.infer<typeof productGroupInputSchema>;
type ProductInput = z.infer<typeof productInputSchema>;
type ReceiptInput = z.infer<typeof receiptInputSchema>;
type IssueInput = z.infer<typeof issueInputSchema>;

export type WarehouseProductGroup = {
  id: string;
  name: string;
  parent_id?: string | null;
  parent_name?: string | null;
  sort_order: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
};

export type WarehouseProduct = {
  id: string;
  group_id?: string | null;
  group_name?: string | null;
  subgroup_name?: string | null;
  group_path?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  quantity_on_hand: number;
  min_quantity?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  is_service?: number | boolean;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
};

export type WarehouseReceipt = {
  id: string;
  document_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_registration_number?: string | null;
  supplier_vat_number?: string | null;
  supplier_address?: string | null;
  supplier_document_number?: string | null;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  operation_description?: string | null;
  notes?: string | null;
  posted_at?: string | null;
  created_at: string;
  updated_at: string;
  lines?: WarehouseReceiptLine[];
};

export type WarehouseReceiptLine = {
  id: string;
  receipt_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  product_unit?: string | null;
  quantity: number;
  unit_price?: number | null;
  sort_order: number;
};

export type WarehouseIssue = {
  id: string;
  document_number: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_registration_number?: string | null;
  buyer_vat_number?: string | null;
  buyer_address?: string | null;
  buyer_document_number?: string | null;
  document_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  operation_description?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  posted_at?: string | null;
  created_at: string;
  updated_at: string;
  lines?: WarehouseIssueLine[];
};

export type WarehouseIssueLine = {
  id: string;
  issue_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  product_unit?: string | null;
  quantity: number;
  unit_price?: number | null;
  sort_order: number;
};

export type WarehouseProductMovement = {
  id: string;
  product_id: string;
  product_name?: string;
  product_unit?: string | null;
  is_service?: number | boolean;
  movement_type: 'in' | 'out' | 'adjust';
  quantity: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at: string;
};

function docNumber(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

async function applyProductStockChange(
  conn: mysql.PoolConnection,
  productId: string,
  delta: number,
  movementType: 'in' | 'out',
  opts: { referenceType?: string; referenceId?: string; notes?: string; createdBy?: string }
): Promise<number> {
  const row = await queryOneConn<{ quantity_on_hand: number; is_service: number }>(
    conn,
    'SELECT quantity_on_hand, is_service FROM warehouse_products WHERE id = ? AND is_active = 1 FOR UPDATE',
    [productId]
  );
  if (!row) throw new AppError(404, 'Prece nav atrasta', 'NOT_FOUND');

  if (Number(row.is_service)) {
    await queryConn(
      conn,
      `INSERT INTO warehouse_product_movements (
        id, product_id, movement_type, quantity, quantity_after,
        reference_type, reference_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        productId,
        movementType,
        Math.abs(delta),
        0,
        opts.referenceType ?? null,
        opts.referenceId ?? null,
        opts.notes ?? null,
        opts.createdBy ?? null,
      ]
    );
    return 0;
  }

  const after = Number(row.quantity_on_hand) + delta;
  if (after < 0) {
    throw new AppError(409, 'Nepietiekams preces atlikums', 'INSUFFICIENT_STOCK');
  }

  await queryConn(conn, 'UPDATE warehouse_products SET quantity_on_hand = ? WHERE id = ?', [
    after,
    productId,
  ]);

  await queryConn(
    conn,
    `INSERT INTO warehouse_product_movements (
      id, product_id, movement_type, quantity, quantity_after,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      productId,
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

async function assertSupplier(clientId: string): Promise<void> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM clients WHERE id = ? AND is_active = 1 AND is_supplier = 1',
    [clientId]
  );
  if (!row) throw new AppError(400, 'Piegādātājs nav atrasts', 'INVALID_SUPPLIER');
}

async function assertBuyer(clientId: string): Promise<void> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM clients WHERE id = ? AND is_active = 1 AND is_buyer = 1',
    [clientId]
  );
  if (!row) throw new AppError(400, 'Pircējs nav atrasts', 'INVALID_BUYER');
}

export async function listProductGroups(): Promise<WarehouseProductGroup[]> {
  return query<WarehouseProductGroup>(
    `SELECT g.*, pg.name AS parent_name,
      (SELECT COUNT(*) FROM warehouse_products p WHERE p.group_id = g.id AND p.is_active = 1) AS product_count
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.is_active = 1
     ORDER BY COALESCE(g.parent_id, g.id), g.parent_id IS NOT NULL, g.sort_order ASC, g.name ASC`
  );
}

async function assertValidParentGroup(parentId: string | null | undefined): Promise<void> {
  if (!parentId) return;
  const parent = await queryOne<{ parent_id: string | null }>(
    'SELECT parent_id FROM warehouse_product_groups WHERE id = ? AND is_active = 1',
    [parentId]
  );
  if (!parent) throw new AppError(400, 'Galvenā grupa nav atrasta', 'INVALID_PARENT_GROUP');
  if (parent.parent_id) {
    throw new AppError(400, 'Apakšgrupu var izveidot tikai zem galvenās grupas', 'INVALID_PARENT_GROUP');
  }
}

export async function createProductGroup(input: GroupInput): Promise<WarehouseProductGroup> {
  await assertValidParentGroup(input.parent_id);
  const id = uuidv4();
  await query(
    `INSERT INTO warehouse_product_groups (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)`,
    [id, input.name.trim(), input.parent_id ?? null, input.sort_order ?? 0]
  );
  const row = await queryOne<WarehouseProductGroup>(
    `SELECT g.*, pg.name AS parent_name
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.id = ?`,
    [id]
  );
  if (!row) throw new AppError(500, 'Neizdevās izveidot grupu');
  return row;
}

export async function updateProductGroup(
  id: string,
  input: Partial<GroupInput>
): Promise<WarehouseProductGroup> {
  const existing = await queryOne<{ id: string; parent_id: string | null }>(
    'SELECT id, parent_id FROM warehouse_product_groups WHERE id = ? AND is_active = 1',
    [id]
  );
  if (!existing) throw new AppError(404, 'Grupa nav atrasta', 'NOT_FOUND');

  if (input.parent_id !== undefined) {
    await assertValidParentGroup(input.parent_id);
    if (input.parent_id === id) {
      throw new AppError(400, 'Grupa nevar būt pati sev apakšgrupa', 'INVALID_PARENT_GROUP');
    }
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name.trim());
  }
  if (input.parent_id !== undefined) {
    fields.push('parent_id = ?');
    values.push(input.parent_id);
  }
  if (input.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(input.sort_order);
  }
  if (fields.length) {
    await query(`UPDATE warehouse_product_groups SET ${fields.join(', ')} WHERE id = ?`, [
      ...values,
      id,
    ]);
  }
  const row = await queryOne<WarehouseProductGroup>(
    `SELECT g.*, pg.name AS parent_name
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.id = ?`,
    [id]
  );
  return row!;
}

export async function deleteProductGroup(id: string): Promise<void> {
  const children = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM warehouse_product_groups WHERE parent_id = ? AND is_active = 1',
    [id]
  );
  if ((children?.total ?? 0) > 0) {
    throw new AppError(409, 'Grupai ir apakšgrupas — vispirms noņemiet tās', 'HAS_SUBGROUPS');
  }
  const inUse = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM warehouse_products WHERE group_id = ? AND is_active = 1',
    [id]
  );
  if ((inUse?.total ?? 0) > 0) {
    throw new AppError(409, 'Grupā ir preces — vispirms pārvietojiet vai dzēsiet tās', 'HAS_PRODUCTS');
  }
  await query('UPDATE warehouse_product_groups SET is_active = 0 WHERE id = ?', [id]);
}

export async function listProducts(search?: string, groupId?: string): Promise<WarehouseProduct[]> {
  let sql = `SELECT p.*,
                    g.name AS group_name,
                    pg.name AS subgroup_name,
                    CASE
                      WHEN pg.name IS NOT NULL THEN CONCAT(pg.name, ' / ', g.name)
                      ELSE g.name
                    END AS group_path
             FROM warehouse_products p
             LEFT JOIN warehouse_product_groups g ON g.id = p.group_id
             LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
             WHERE p.is_active = 1`;
  const params: unknown[] = [];
  if (groupId) {
    sql += ` AND (p.group_id = ? OR p.group_id IN (
      SELECT id FROM warehouse_product_groups WHERE parent_id = ? AND is_active = 1
    ))`;
    params.push(groupId, groupId);
  }
  if (search?.trim()) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }
  sql += ' ORDER BY pg.sort_order ASC, pg.name ASC, g.sort_order ASC, g.name ASC, p.name ASC';
  return query<WarehouseProduct>(sql, params);
}

export async function createProduct(
  input: ProductInput,
  createdBy?: string
): Promise<WarehouseProduct> {
  const id = uuidv4();
  await query(
    `INSERT INTO warehouse_products (
      id, group_id, sku, name, description, unit, min_quantity, purchase_price, sale_price, is_service, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.group_id ?? null,
      input.sku ?? null,
      input.name.trim(),
      input.description ?? null,
      input.unit || 'gab',
      input.min_quantity ?? null,
      input.purchase_price ?? null,
      input.sale_price ?? null,
      input.is_service ? 1 : 0,
      createdBy ?? null,
    ]
  );
  const row = await queryOne<WarehouseProduct>(
    `SELECT p.*,
            g.name AS group_name,
            pg.name AS subgroup_name,
            CASE
              WHEN pg.name IS NOT NULL THEN CONCAT(pg.name, ' / ', g.name)
              ELSE g.name
            END AS group_path
     FROM warehouse_products p
     LEFT JOIN warehouse_product_groups g ON g.id = p.group_id
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE p.id = ?`,
    [id]
  );
  if (!row) throw new AppError(500, 'Neizdevās izveidot preci');
  return row;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<WarehouseProduct> {
  const existing = await queryOne(
    'SELECT id FROM warehouse_products WHERE id = ? AND is_active = 1',
    [id]
  );
  if (!existing) throw new AppError(404, 'Prece nav atrasta', 'NOT_FOUND');

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of [
    'group_id',
    'sku',
    'name',
    'description',
    'unit',
    'min_quantity',
    'purchase_price',
    'sale_price',
    'is_service',
  ] as const) {
    if (input[key] !== undefined) {
      fields.push(`${key} = ?`);
      const v = input[key];
      if (key === 'is_service') {
        values.push(v ? 1 : 0);
      } else {
        values.push(typeof v === 'string' ? v.trim() || null : v ?? null);
      }
    }
  }
  if (fields.length) {
    await query(`UPDATE warehouse_products SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  }
  const row = await queryOne<WarehouseProduct>(
    `SELECT p.*,
            g.name AS group_name,
            pg.name AS subgroup_name,
            CASE
              WHEN pg.name IS NOT NULL THEN CONCAT(pg.name, ' / ', g.name)
              ELSE g.name
            END AS group_path
     FROM warehouse_products p
     LEFT JOIN warehouse_product_groups g ON g.id = p.group_id
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE p.id = ?`,
    [id]
  );
  return row!;
}

export async function deleteProduct(id: string): Promise<void> {
  await query('UPDATE warehouse_products SET is_active = 0 WHERE id = ?', [id]);
}

export async function listProductMovements(opts?: {
  productId?: string;
  limit?: number;
}): Promise<WarehouseProductMovement[]> {
  const params: unknown[] = [];
  let where = 'WHERE p.is_active = 1';
  if (opts?.productId) {
    where += ' AND m.product_id = ?';
    params.push(opts.productId);
  }
  const limit = Math.min(opts?.limit ?? 500, 1000);
  return query<WarehouseProductMovement>(
    `SELECT m.*,
            p.name AS product_name,
            p.unit AS product_unit,
            p.is_service,
            u.full_name AS created_by_name,
            CASE
              WHEN m.reference_type = 'receipt' THEN (
                SELECT document_number FROM warehouse_receipts WHERE id = m.reference_id LIMIT 1
              )
              WHEN m.reference_type = 'issue' THEN (
                SELECT document_number FROM warehouse_issues WHERE id = m.reference_id LIMIT 1
              )
              ELSE NULL
            END AS reference_number
     FROM warehouse_product_movements m
     JOIN warehouse_products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.created_by
     ${where}
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [...params, limit]
  );
}

async function loadReceiptLines(receiptId: string): Promise<WarehouseReceiptLine[]> {
  return query<WarehouseReceiptLine>(
    `SELECT l.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
     FROM warehouse_receipt_lines l
     JOIN warehouse_products p ON p.id = l.product_id
     WHERE l.receipt_id = ?
     ORDER BY l.sort_order ASC, l.id ASC`,
    [receiptId]
  );
}

const RECEIPT_SELECT = `
  SELECT r.*,
         c.name AS supplier_name,
         c.registration_number AS supplier_registration_number,
         c.vat_number AS supplier_vat_number,
         c.address AS supplier_address
  FROM warehouse_receipts r
  JOIN clients c ON c.id = r.supplier_id
`;

export async function listReceipts(): Promise<WarehouseReceipt[]> {
  return query<WarehouseReceipt>(
    `${RECEIPT_SELECT}
     ORDER BY r.document_date DESC, r.created_at DESC`
  );
}

export async function getReceipt(id: string): Promise<WarehouseReceipt | null> {
  const row = await queryOne<WarehouseReceipt>(`${RECEIPT_SELECT} WHERE r.id = ?`, [id]);
  if (!row) return null;
  row.lines = await loadReceiptLines(id);
  return row;
}

export async function createReceipt(
  input: ReceiptInput,
  createdBy?: string
): Promise<WarehouseReceipt> {
  await assertSupplier(input.supplier_id);
  const id = uuidv4();
  const documentNumber = docNumber('WH-IN');

  await withMysqlTransaction(async (conn) => {
    await queryConn(
      conn,
      `INSERT INTO warehouse_receipts (
        id, document_number, supplier_id, supplier_document_number, document_date,
        status, operation_description, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [
        id,
        documentNumber,
        input.supplier_id,
        input.supplier_document_number?.trim() || null,
        input.document_date,
        input.operation_description?.trim() || null,
        input.notes ?? null,
        createdBy ?? null,
      ]
    );

    let sort = 0;
    for (const line of input.lines) {
      await queryConn(
        conn,
        `INSERT INTO warehouse_receipt_lines (id, receipt_id, product_id, quantity, unit_price, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, line.product_id, line.quantity, line.unit_price ?? null, sort++]
      );
    }
  });

  const receipt = await getReceipt(id);
  if (!receipt) throw new AppError(500, 'Neizdevās izveidot pavadzīmi');
  return receipt;
}

export async function postReceipt(id: string, createdBy?: string): Promise<WarehouseReceipt> {
  const receipt = await getReceipt(id);
  if (!receipt) throw new AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
  if (receipt.status !== 'draft') {
    throw new AppError(409, 'Pavadzīme jau ir apstrādāta', 'INVALID_STATUS');
  }
  if (!receipt.lines?.length) {
    throw new AppError(400, 'Pavadzīmei nav rindu', 'NO_LINES');
  }

  await withMysqlTransaction(async (conn) => {
    for (const line of receipt.lines!) {
      await applyProductStockChange(conn, line.product_id, line.quantity, 'in', {
        referenceType: 'receipt',
        referenceId: id,
        notes: `Saņemšana ${receipt.document_number}`,
        createdBy,
      });
    }
    await queryConn(
      conn,
      `UPDATE warehouse_receipts SET status = 'posted', posted_at = NOW() WHERE id = ?`,
      [id]
    );
  });

  return (await getReceipt(id))!;
}

async function loadIssueLines(issueId: string): Promise<WarehouseIssueLine[]> {
  return query<WarehouseIssueLine>(
    `SELECT l.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
     FROM warehouse_issue_lines l
     JOIN warehouse_products p ON p.id = l.product_id
     WHERE l.issue_id = ?
     ORDER BY l.sort_order ASC, l.id ASC`,
    [issueId]
  );
}

const ISSUE_SELECT = `
  SELECT i.*,
         c.name AS buyer_name,
         c.registration_number AS buyer_registration_number,
         c.vat_number AS buyer_vat_number,
         c.address AS buyer_address
  FROM warehouse_issues i
  JOIN clients c ON c.id = i.buyer_id
`;

export async function listIssues(): Promise<WarehouseIssue[]> {
  return query<WarehouseIssue>(
    `${ISSUE_SELECT}
     ORDER BY i.document_date DESC, i.created_at DESC`
  );
}

export async function getIssue(id: string): Promise<WarehouseIssue | null> {
  const row = await queryOne<WarehouseIssue>(`${ISSUE_SELECT} WHERE i.id = ?`, [id]);
  if (!row) return null;
  row.lines = await loadIssueLines(id);
  return row;
}

export async function createIssue(input: IssueInput, createdBy?: string): Promise<WarehouseIssue> {
  await assertBuyer(input.buyer_id);
  const id = uuidv4();
  const documentNumber = docNumber('WH-OUT');

  await withMysqlTransaction(async (conn) => {
    await queryConn(
      conn,
      `INSERT INTO warehouse_issues (
        id, document_number, buyer_id, buyer_document_number, document_date,
        status, operation_description, delivery_address, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        id,
        documentNumber,
        input.buyer_id,
        input.buyer_document_number?.trim() || null,
        input.document_date,
        input.operation_description?.trim() || null,
        input.delivery_address?.trim() || null,
        input.notes ?? null,
        createdBy ?? null,
      ]
    );

    let sort = 0;
    for (const line of input.lines) {
      await queryConn(
        conn,
        `INSERT INTO warehouse_issue_lines (id, issue_id, product_id, quantity, unit_price, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, line.product_id, line.quantity, line.unit_price ?? null, sort++]
      );
    }
  });

  const issue = await getIssue(id);
  if (!issue) throw new AppError(500, 'Neizdevās izveidot pavadzīmi');
  return issue;
}

export async function postIssue(id: string, createdBy?: string): Promise<WarehouseIssue> {
  const issue = await getIssue(id);
  if (!issue) throw new AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
  if (issue.status !== 'draft') {
    throw new AppError(409, 'Pavadzīme jau ir apstrādāta', 'INVALID_STATUS');
  }
  if (!issue.lines?.length) {
    throw new AppError(400, 'Pavadzīmei nav rindu', 'NO_LINES');
  }

  await withMysqlTransaction(async (conn) => {
    for (const line of issue.lines!) {
      await applyProductStockChange(conn, line.product_id, -line.quantity, 'out', {
        referenceType: 'issue',
        referenceId: id,
        notes: `Izrakstīšana ${issue.document_number}`,
        createdBy,
      });
    }
    await queryConn(
      conn,
      `UPDATE warehouse_issues SET status = 'posted', posted_at = NOW() WHERE id = ?`,
      [id]
    );
  });

  return (await getIssue(id))!;
}
