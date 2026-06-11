"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWarehouseItems = listWarehouseItems;
exports.getWarehouseItem = getWarehouseItem;
exports.createWarehouseItem = createWarehouseItem;
exports.updateWarehouseItem = updateWarehouseItem;
exports.stockIn = stockIn;
exports.consumeStock = consumeStock;
exports.returnStock = returnStock;
exports.listMovements = listMovements;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
async function listWarehouseItems(search) {
    let sql = 'SELECT * FROM warehouse_items WHERE is_active = 1';
    const params = [];
    if (search?.trim()) {
        sql += ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
    }
    sql += ' ORDER BY name ASC';
    return (0, pool_1.query)(sql, params);
}
async function getWarehouseItem(id) {
    return (0, pool_1.queryOne)('SELECT * FROM warehouse_items WHERE id = ? AND is_active = 1', [id]);
}
async function createWarehouseItem(input, createdBy) {
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO warehouse_items (id, sku, name, description, unit, min_quantity, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        id,
        input.sku ?? null,
        input.name.trim(),
        input.description ?? null,
        input.unit || 'gab',
        input.min_quantity ?? null,
        createdBy ?? null,
    ]);
    const item = await getWarehouseItem(id);
    if (!item)
        throw new errorHandler_1.AppError(500, 'Failed to create item');
    return item;
}
async function updateWarehouseItem(id, input) {
    const existing = await getWarehouseItem(id);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Materiāls nav atrasts', 'NOT_FOUND');
    const fields = [];
    const values = [];
    for (const key of ['sku', 'name', 'description', 'unit', 'min_quantity']) {
        if (input[key] !== undefined) {
            fields.push(`${key} = ?`);
            const v = input[key];
            values.push(typeof v === 'string' ? v.trim() || null : v ?? null);
        }
    }
    if (fields.length === 0)
        return existing;
    await (0, pool_1.query)(`UPDATE warehouse_items SET ${fields.join(', ')} WHERE id = ?`, [
        ...values,
        id,
    ]);
    const item = await getWarehouseItem(id);
    if (!item)
        throw new errorHandler_1.AppError(404, 'Materiāls nav atrasts');
    return item;
}
async function applyStockChange(conn, itemId, delta, movementType, opts) {
    const item = await (0, pool_1.queryOneConn)(conn, 'SELECT quantity_on_hand FROM warehouse_items WHERE id = ? AND is_active = 1 FOR UPDATE', [itemId]);
    if (!item)
        throw new errorHandler_1.AppError(404, 'Materiāls nav atrasts', 'NOT_FOUND');
    const after = Number(item.quantity_on_hand) + delta;
    if (after < 0) {
        throw new errorHandler_1.AppError(409, 'Nepietiekams atlikums noliktavā', 'INSUFFICIENT_STOCK');
    }
    await (0, pool_1.queryConn)(conn, 'UPDATE warehouse_items SET quantity_on_hand = ? WHERE id = ?', [
        after,
        itemId,
    ]);
    const movementId = (0, uuid_1.v4)();
    await (0, pool_1.queryConn)(conn, `INSERT INTO warehouse_movements (
      id, item_id, movement_type, quantity, quantity_after,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        movementId,
        itemId,
        movementType,
        Math.abs(delta),
        after,
        opts.referenceType ?? null,
        opts.referenceId ?? null,
        opts.notes ?? null,
        opts.createdBy ?? null,
    ]);
    return after;
}
async function stockIn(itemId, input, createdBy) {
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        await applyStockChange(conn, itemId, input.quantity, 'in', {
            notes: input.notes,
            createdBy,
        });
    });
    const item = await getWarehouseItem(itemId);
    if (!item)
        throw new errorHandler_1.AppError(404, 'Materiāls nav atrasts');
    return item;
}
async function consumeStock(itemId, quantity, referenceType, referenceId, createdBy, notes) {
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        await applyStockChange(conn, itemId, -quantity, 'out', {
            referenceType,
            referenceId,
            notes,
            createdBy,
        });
    });
}
async function returnStock(itemId, quantity, referenceType, referenceId, createdBy) {
    await (0, pool_1.withMysqlTransaction)(async (conn) => {
        await applyStockChange(conn, itemId, quantity, 'in', {
            referenceType,
            referenceId,
            notes: 'Atgriezts no atgadījuma',
            createdBy,
        });
    });
}
async function listMovements(itemId, limit = 20) {
    return (0, pool_1.query)(`SELECT * FROM warehouse_movements WHERE item_id = ?
     ORDER BY created_at DESC LIMIT ?`, [itemId, limit]);
}
//# sourceMappingURL=warehouse.js.map