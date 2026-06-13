"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductGroups = listProductGroups;
exports.createProductGroup = createProductGroup;
exports.updateProductGroup = updateProductGroup;
exports.deleteProductGroup = deleteProductGroup;
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.listProductMovements = listProductMovements;
exports.listReceipts = listReceipts;
exports.getReceipt = getReceipt;
exports.createReceipt = createReceipt;
exports.updateReceipt = updateReceipt;
exports.updateReceiptLines = updateReceiptLines;
exports.postReceipt = postReceipt;
exports.unpostReceipt = unpostReceipt;
exports.payReceipt = payReceipt;
exports.listIssues = listIssues;
exports.getIssue = getIssue;
exports.createIssue = createIssue;
exports.postIssue = postIssue;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const warehousePricing_1 = require("../utils/warehousePricing");
function docNumber(prefix) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${date}-${rand}`;
}
async function changeProductStockOnHand(conn, productId, delta) {
    const row = await (0, pool_1.queryOneConn)(conn, 'SELECT quantity_on_hand, is_service FROM warehouse_products WHERE id = ? AND is_active = 1 FOR UPDATE', [productId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Prece nav atrasta', 'NOT_FOUND');
    if (Number(row.is_service)) {
        return { after: 0, isService: true };
    }
    const after = Number(row.quantity_on_hand) + delta;
    if (after < 0) {
        throw new errorHandler_1.AppError(409, 'Nepietiekams preces atlikums', 'INSUFFICIENT_STOCK');
    }
    await (0, pool_1.queryConn)(conn, 'UPDATE warehouse_products SET quantity_on_hand = ? WHERE id = ?', [
        after,
        productId,
    ]);
    return { after, isService: false };
}
async function applyProductStockChange(conn, productId, delta, movementType, opts) {
    const { after, isService } = await changeProductStockOnHand(conn, productId, delta);
    await (0, pool_1.queryConn)(conn, `INSERT INTO warehouse_product_movements (
      id, product_id, movement_type, quantity, quantity_after,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        (0, uuid_1.v4)(),
        productId,
        movementType,
        Math.abs(delta),
        isService ? 0 : after,
        opts.referenceType ?? null,
        opts.referenceId ?? null,
        opts.notes ?? null,
        opts.createdBy ?? null,
    ]);
    return after;
}
async function deleteReceiptMovements(conn, receiptId) {
    await (0, pool_1.queryConn)(conn, `DELETE FROM warehouse_product_movements
     WHERE reference_type = 'receipt' AND reference_id = ?`, [receiptId]);
}
async function assertSupplier(clientId) {
    const row = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ? AND is_active = 1 AND is_supplier = 1', [clientId]);
    if (!row)
        throw new errorHandler_1.AppError(400, 'Piegādātājs nav atrasts', 'INVALID_SUPPLIER');
}
async function assertBuyer(clientId) {
    const row = await (0, pool_1.queryOne)('SELECT id FROM clients WHERE id = ? AND is_active = 1 AND is_buyer = 1', [clientId]);
    if (!row)
        throw new errorHandler_1.AppError(400, 'Pircējs nav atrasts', 'INVALID_BUYER');
}
async function listProductGroups() {
    return (0, pool_1.query)(`SELECT g.*, pg.name AS parent_name,
      (SELECT COUNT(*) FROM warehouse_products p WHERE p.group_id = g.id AND p.is_active = 1) AS product_count
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.is_active = 1
     ORDER BY COALESCE(g.parent_id, g.id), g.parent_id IS NOT NULL, g.sort_order ASC, g.name ASC`);
}
async function assertValidParentGroup(parentId) {
    if (!parentId)
        return;
    const parent = await (0, pool_1.queryOne)('SELECT parent_id FROM warehouse_product_groups WHERE id = ? AND is_active = 1', [parentId]);
    if (!parent)
        throw new errorHandler_1.AppError(400, 'Galvenā grupa nav atrasta', 'INVALID_PARENT_GROUP');
    if (parent.parent_id) {
        throw new errorHandler_1.AppError(400, 'Apakšgrupu var izveidot tikai zem galvenās grupas', 'INVALID_PARENT_GROUP');
    }
}
async function createProductGroup(input) {
    await assertValidParentGroup(input.parent_id);
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO warehouse_product_groups (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)`, [id, input.name.trim(), input.parent_id ?? null, input.sort_order ?? 0]);
    const row = await (0, pool_1.queryOne)(`SELECT g.*, pg.name AS parent_name
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.id = ?`, [id]);
    if (!row)
        throw new errorHandler_1.AppError(500, 'Neizdevās izveidot grupu');
    return row;
}
async function updateProductGroup(id, input) {
    const existing = await (0, pool_1.queryOne)('SELECT id, parent_id FROM warehouse_product_groups WHERE id = ? AND is_active = 1', [id]);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Grupa nav atrasta', 'NOT_FOUND');
    if (input.parent_id !== undefined) {
        await assertValidParentGroup(input.parent_id);
        if (input.parent_id === id) {
            throw new errorHandler_1.AppError(400, 'Grupa nevar būt pati sev apakšgrupa', 'INVALID_PARENT_GROUP');
        }
    }
    const fields = [];
    const values = [];
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
        await (0, pool_1.query)(`UPDATE warehouse_product_groups SET ${fields.join(', ')} WHERE id = ?`, [
            ...values,
            id,
        ]);
    }
    const row = await (0, pool_1.queryOne)(`SELECT g.*, pg.name AS parent_name
     FROM warehouse_product_groups g
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE g.id = ?`, [id]);
    return row;
}
async function deleteProductGroup(id) {
    const children = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM warehouse_product_groups WHERE parent_id = ? AND is_active = 1', [id]);
    if ((children?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Grupai ir apakšgrupas — vispirms noņemiet tās', 'HAS_SUBGROUPS');
    }
    const inUse = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM warehouse_products WHERE group_id = ? AND is_active = 1', [id]);
    if ((inUse?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Grupā ir preces — vispirms pārvietojiet vai dzēsiet tās', 'HAS_PRODUCTS');
    }
    await (0, pool_1.query)('UPDATE warehouse_product_groups SET is_active = 0 WHERE id = ?', [id]);
}
async function listProducts(search, groupId, exactGroup) {
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
    const params = [];
    if (groupId) {
        if (exactGroup) {
            sql += ' AND p.group_id = ?';
            params.push(groupId);
        }
        else {
            sql += ` AND (p.group_id = ? OR p.group_id IN (
        SELECT id FROM warehouse_product_groups WHERE parent_id = ? AND is_active = 1
      ))`;
            params.push(groupId, groupId);
        }
    }
    if (search?.trim()) {
        sql += ' AND (p.name LIKE ? OR p.secondary_name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term);
    }
    sql += ' ORDER BY pg.sort_order ASC, pg.name ASC, g.sort_order ASC, g.name ASC, p.name ASC';
    return (0, pool_1.query)(sql, params);
}
async function createProduct(input, createdBy) {
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO warehouse_products (
      id, group_id, sku, name, secondary_name, description, unit, min_quantity,
      purchase_price, sale_price, desired_markup_percent, vat_rate, is_service, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        input.group_id ?? null,
        input.sku ?? null,
        input.name.trim(),
        input.secondary_name?.trim() || null,
        input.description ?? null,
        input.unit || 'gab',
        input.min_quantity ?? null,
        input.purchase_price ?? null,
        input.sale_price ?? null,
        input.desired_markup_percent ?? null,
        input.vat_rate ?? 21,
        input.is_service ? 1 : 0,
        createdBy ?? null,
    ]);
    const row = await (0, pool_1.queryOne)(`SELECT p.*,
            g.name AS group_name,
            pg.name AS subgroup_name,
            CASE
              WHEN pg.name IS NOT NULL THEN CONCAT(pg.name, ' / ', g.name)
              ELSE g.name
            END AS group_path
     FROM warehouse_products p
     LEFT JOIN warehouse_product_groups g ON g.id = p.group_id
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE p.id = ?`, [id]);
    if (!row)
        throw new errorHandler_1.AppError(500, 'Neizdevās izveidot preci');
    return row;
}
async function updateProduct(id, input) {
    const existing = await (0, pool_1.queryOne)('SELECT id FROM warehouse_products WHERE id = ? AND is_active = 1', [id]);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Prece nav atrasta', 'NOT_FOUND');
    const fields = [];
    const values = [];
    for (const key of [
        'group_id',
        'sku',
        'name',
        'secondary_name',
        'description',
        'unit',
        'min_quantity',
        'purchase_price',
        'sale_price',
        'desired_markup_percent',
        'vat_rate',
        'is_service',
    ]) {
        if (input[key] !== undefined) {
            fields.push(`${key} = ?`);
            const v = input[key];
            if (key === 'is_service') {
                values.push(v ? 1 : 0);
            }
            else if (key === 'secondary_name') {
                values.push(typeof v === 'string' ? v.trim() || null : v ?? null);
            }
            else {
                values.push(typeof v === 'string' ? v.trim() || null : v ?? null);
            }
        }
    }
    if (fields.length) {
        await (0, pool_1.query)(`UPDATE warehouse_products SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    }
    const row = await (0, pool_1.queryOne)(`SELECT p.*,
            g.name AS group_name,
            pg.name AS subgroup_name,
            CASE
              WHEN pg.name IS NOT NULL THEN CONCAT(pg.name, ' / ', g.name)
              ELSE g.name
            END AS group_path
     FROM warehouse_products p
     LEFT JOIN warehouse_product_groups g ON g.id = p.group_id
     LEFT JOIN warehouse_product_groups pg ON pg.id = g.parent_id
     WHERE p.id = ?`, [id]);
    return row;
}
async function deleteProduct(id) {
    await (0, pool_1.query)('UPDATE warehouse_products SET is_active = 0 WHERE id = ?', [id]);
}
async function listProductMovements(opts) {
    const params = [];
    let where = 'WHERE p.is_active = 1';
    if (opts?.productId) {
        where += ' AND m.product_id = ?';
        params.push(opts.productId);
    }
    const limit = Math.min(opts?.limit ?? 500, 1000);
    return (0, pool_1.query)(`SELECT m.*,
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
            END AS reference_number,
            CASE
              WHEN m.reference_type = 'receipt' THEN (
                SELECT status FROM warehouse_receipts WHERE id = m.reference_id LIMIT 1
              )
              WHEN m.reference_type = 'issue' THEN (
                SELECT status FROM warehouse_issues WHERE id = m.reference_id LIMIT 1
              )
              ELSE NULL
            END AS reference_status
     FROM warehouse_product_movements m
     JOIN warehouse_products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.created_by
     ${where}
     ORDER BY m.created_at DESC
     LIMIT ?`, [...params, limit]);
}
async function loadReceiptLines(receiptId) {
    return (0, pool_1.query)(`SELECT l.*,
            p.name AS product_name,
            p.secondary_name AS product_secondary_name,
            p.sku AS product_sku,
            p.unit AS product_unit,
            p.vat_rate AS product_vat_rate
     FROM warehouse_receipt_lines l
     JOIN warehouse_products p ON p.id = l.product_id
     WHERE l.receipt_id = ?
     ORDER BY l.sort_order ASC, l.id ASC`, [receiptId]);
}
function normalizeDocumentDate(value) {
    if (value == null || value === '')
        return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(value);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}
function normalizeReceipt(receipt) {
    receipt.document_date = normalizeDocumentDate(receipt.document_date);
    return receipt;
}
function enrichReceiptTotals(receipt) {
    const pricingLines = (receipt.lines ?? []).map((line) => ({
        quantity: Number(line.quantity),
        purchase_price_ex_vat: Number(line.unit_price ?? 0),
        sale_price_inc_vat: Number(line.sale_price ?? 0),
        vat_rate: Number(line.product_vat_rate ?? 21),
    }));
    const totals = (0, warehousePricing_1.calcReceiptTotals)(pricingLines);
    receipt.total_purchase_ex_vat = totals.purchase_ex_vat;
    receipt.total_vat = totals.vat_amount;
    receipt.total_purchase_inc_vat = totals.purchase_inc_vat;
    receipt.total_sale_inc_vat = totals.sale_inc_vat;
    const payment = (0, warehousePricing_1.calcPaymentStatus)(Number(receipt.amount_paid ?? 0), totals.purchase_inc_vat);
    receipt.payment_status = payment.status;
    receipt.amount_remaining = payment.remaining;
    return receipt;
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
async function listReceipts(opts) {
    let sql = `${RECEIPT_SELECT} WHERE 1=1`;
    const params = [];
    if (opts?.supplierId) {
        sql += ' AND r.supplier_id = ?';
        params.push(opts.supplierId);
    }
    const sortBy = opts?.sortBy === 'supplier' ? 'c.name' : 'r.document_date';
    const sortDir = opts?.sortDir === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortBy} ${sortDir}, r.created_at DESC`;
    const rows = await (0, pool_1.query)(sql, params);
    const enriched = await Promise.all(rows.map(async (row) => {
        normalizeReceipt(row);
        row.lines = await loadReceiptLines(row.id);
        return enrichReceiptTotals(row);
    }));
    if (opts?.unpaidOnly) {
        return enriched.filter((r) => r.payment_status !== 'paid');
    }
    return enriched;
}
async function getReceipt(id) {
    const row = await (0, pool_1.queryOne)(`${RECEIPT_SELECT} WHERE r.id = ?`, [id]);
    if (!row)
        return null;
    normalizeReceipt(row);
    row.lines = await loadReceiptLines(id);
    return enrichReceiptTotals(row);
}
async function assertReceiptEditable(receipt) {
    if (receipt.status !== 'draft') {
        throw new errorHandler_1.AppError(409, 'Pavadzīmi var labot tikai melnraksta statusā', 'INVALID_STATUS');
    }
}
async function createReceipt(input, createdBy) {
    await assertSupplier(input.supplier_id);
    const id = (0, uuid_1.v4)();
    const documentNumber = docNumber('WH-IN');
    await (0, pool_1.query)(`INSERT INTO warehouse_receipts (
      id, document_number, supplier_id, supplier_document_number, document_date,
      status, operation_description, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`, [
        id,
        documentNumber,
        input.supplier_id,
        input.supplier_document_number?.trim() || null,
        input.document_date,
        input.operation_description?.trim() || null,
        input.notes ?? null,
        createdBy ?? null,
    ]);
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(500, 'Neizdevās izveidot pavadzīmi');
    return receipt;
}
async function updateReceipt(id, input) {
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    await assertReceiptEditable(receipt);
    if (input.supplier_id)
        await assertSupplier(input.supplier_id);
    const fields = [];
    const values = [];
    if (input.supplier_id !== undefined) {
        fields.push('supplier_id = ?');
        values.push(input.supplier_id);
    }
    if (input.supplier_document_number !== undefined) {
        fields.push('supplier_document_number = ?');
        values.push(input.supplier_document_number?.trim() || null);
    }
    if (input.document_date !== undefined) {
        const normalized = normalizeDocumentDate(input.document_date);
        if (!normalized) {
            throw new errorHandler_1.AppError(400, 'Pavadzīmes datums ir obligāts', 'INVALID_DATE');
        }
        fields.push('document_date = ?');
        values.push(normalized);
    }
    if (input.operation_description !== undefined) {
        fields.push('operation_description = ?');
        values.push(input.operation_description?.trim() || null);
    }
    if (input.notes !== undefined) {
        fields.push('notes = ?');
        values.push(input.notes ?? null);
    }
    if (fields.length) {
        await (0, pool_1.query)(`UPDATE warehouse_receipts SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    }
    return (await getReceipt(id));
}
async function updateReceiptLines(id, lines) {
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    await assertReceiptEditable(receipt);
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        await (0, pool_1.queryConn)(conn, 'DELETE FROM warehouse_receipt_lines WHERE receipt_id = ?', [id]);
        let sort = 0;
        for (const line of lines) {
            await (0, pool_1.queryConn)(conn, `INSERT INTO warehouse_receipt_lines (
          id, receipt_id, product_id, quantity, unit_price, markup_percent, sale_price, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                (0, uuid_1.v4)(),
                id,
                line.product_id,
                line.quantity,
                line.purchase_price ?? null,
                line.markup_percent ?? null,
                line.sale_price ?? null,
                sort++,
            ]);
        }
    });
    return (await getReceipt(id));
}
async function syncProductPricesFromReceiptLines(conn, lines) {
    for (const line of lines) {
        if (line.unit_price == null && line.sale_price == null)
            continue;
        await (0, pool_1.queryConn)(conn, `UPDATE warehouse_products
       SET purchase_price = COALESCE(?, purchase_price),
           sale_price = COALESCE(?, sale_price)
       WHERE id = ?`, [line.unit_price ?? null, line.sale_price ?? null, line.product_id]);
    }
}
async function postReceipt(id, createdBy) {
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    if (receipt.status !== 'draft') {
        throw new errorHandler_1.AppError(409, 'Pavadzīme jau ir apstrādāta', 'INVALID_STATUS');
    }
    if (!receipt.lines?.length) {
        throw new errorHandler_1.AppError(400, 'Pavadzīmei nav rindu', 'NO_LINES');
    }
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        for (const line of receipt.lines) {
            await applyProductStockChange(conn, line.product_id, line.quantity, 'in', {
                referenceType: 'receipt',
                referenceId: id,
                notes: `Saņemšana ${receipt.document_number}`,
                createdBy,
            });
        }
        await syncProductPricesFromReceiptLines(conn, receipt.lines);
        await (0, pool_1.queryConn)(conn, `UPDATE warehouse_receipts SET status = 'posted', posted_at = NOW() WHERE id = ?`, [id]);
    });
    return (await getReceipt(id));
}
async function unpostReceipt(id, createdBy) {
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    if (receipt.status !== 'posted') {
        throw new errorHandler_1.AppError(409, 'Atcelt grāmatošanu var tikai grāmatotai pavadzīmei', 'INVALID_STATUS');
    }
    if (!receipt.lines?.length) {
        throw new errorHandler_1.AppError(400, 'Pavadzīmei nav rindu', 'NO_LINES');
    }
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        for (const line of receipt.lines) {
            await changeProductStockOnHand(conn, line.product_id, -line.quantity);
        }
        await deleteReceiptMovements(conn, id);
        await (0, pool_1.queryConn)(conn, `UPDATE warehouse_receipts SET status = 'draft', posted_at = NULL WHERE id = ?`, [id]);
    });
    return (await getReceipt(id));
}
async function payReceipt(id, amount) {
    const receipt = await getReceipt(id);
    if (!receipt)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    if (receipt.status !== 'posted') {
        throw new errorHandler_1.AppError(409, 'Apmaksāt var tikai grāmatotu pavadzīmi', 'INVALID_STATUS');
    }
    const due = Number(receipt.total_purchase_inc_vat ?? 0);
    if (due <= 0) {
        throw new errorHandler_1.AppError(400, 'Pavadzīmei nav summas apmaksai', 'NO_AMOUNT');
    }
    const paid = (0, warehousePricing_1.roundMoney)(Number(receipt.amount_paid ?? 0) + amount);
    if (paid > due + 0.001) {
        throw new errorHandler_1.AppError(400, 'Apmaksas summa pārsniedz pavadzīmes summu', 'OVERPAYMENT');
    }
    await (0, pool_1.query)('UPDATE warehouse_receipts SET amount_paid = ? WHERE id = ?', [paid, id]);
    return (await getReceipt(id));
}
async function loadIssueLines(issueId) {
    return (0, pool_1.query)(`SELECT l.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
     FROM warehouse_issue_lines l
     JOIN warehouse_products p ON p.id = l.product_id
     WHERE l.issue_id = ?
     ORDER BY l.sort_order ASC, l.id ASC`, [issueId]);
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
async function listIssues() {
    return (0, pool_1.query)(`${ISSUE_SELECT}
     ORDER BY i.document_date DESC, i.created_at DESC`);
}
async function getIssue(id) {
    const row = await (0, pool_1.queryOne)(`${ISSUE_SELECT} WHERE i.id = ?`, [id]);
    if (!row)
        return null;
    row.lines = await loadIssueLines(id);
    return row;
}
async function createIssue(input, createdBy) {
    await assertBuyer(input.buyer_id);
    const id = (0, uuid_1.v4)();
    const documentNumber = docNumber('WH-OUT');
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        await (0, pool_1.queryConn)(conn, `INSERT INTO warehouse_issues (
        id, document_number, buyer_id, buyer_document_number, document_date,
        status, operation_description, delivery_address, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`, [
            id,
            documentNumber,
            input.buyer_id,
            input.buyer_document_number?.trim() || null,
            input.document_date,
            input.operation_description?.trim() || null,
            input.delivery_address?.trim() || null,
            input.notes ?? null,
            createdBy ?? null,
        ]);
        let sort = 0;
        for (const line of input.lines) {
            await (0, pool_1.queryConn)(conn, `INSERT INTO warehouse_issue_lines (id, issue_id, product_id, quantity, unit_price, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, line.product_id, line.quantity, line.unit_price ?? null, sort++]);
        }
    });
    const issue = await getIssue(id);
    if (!issue)
        throw new errorHandler_1.AppError(500, 'Neizdevās izveidot pavadzīmi');
    return issue;
}
async function postIssue(id, createdBy) {
    const issue = await getIssue(id);
    if (!issue)
        throw new errorHandler_1.AppError(404, 'Pavadzīme nav atrasta', 'NOT_FOUND');
    if (issue.status !== 'draft') {
        throw new errorHandler_1.AppError(409, 'Pavadzīme jau ir apstrādāta', 'INVALID_STATUS');
    }
    if (!issue.lines?.length) {
        throw new errorHandler_1.AppError(400, 'Pavadzīmei nav rindu', 'NO_LINES');
    }
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        for (const line of issue.lines) {
            await applyProductStockChange(conn, line.product_id, -line.quantity, 'out', {
                referenceType: 'issue',
                referenceId: id,
                notes: `Izrakstīšana ${issue.document_number}`,
                createdBy,
            });
        }
        await (0, pool_1.queryConn)(conn, `UPDATE warehouse_issues SET status = 'posted', posted_at = NOW() WHERE id = ?`, [id]);
    });
    return (await getIssue(id));
}
//# sourceMappingURL=warehouseCommercial.js.map