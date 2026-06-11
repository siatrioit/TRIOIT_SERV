"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkLogs = listWorkLogs;
exports.addWorkLog = addWorkLog;
exports.deleteWorkLog = deleteWorkLog;
exports.listIncidentMaterials = listIncidentMaterials;
exports.addIncidentMaterial = addIncidentMaterial;
exports.deleteIncidentMaterial = deleteIncidentMaterial;
exports.getWorkSummary = getWorkSummary;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const warehouse_1 = require("./warehouse");
async function assertIncidentEditable(incidentId) {
    const row = await (0, pool_1.queryOne)('SELECT status FROM incidents WHERE id = ?', [incidentId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
    if (row.status === 'completed' || row.status === 'cancelled') {
        throw new errorHandler_1.AppError(409, 'Atgadījums ir slēgts — labot nevar', 'INCIDENT_CLOSED');
    }
}
async function listWorkLogs(incidentId) {
    return (0, pool_1.query)(`SELECT w.*, u.full_name AS user_name
     FROM incident_work_logs w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.incident_id = ?
     ORDER BY w.work_date DESC, w.created_at DESC`, [incidentId]);
}
async function addWorkLog(incidentId, input, createdBy) {
    await assertIncidentEditable(incidentId);
    const id = (0, uuid_1.v4)();
    const userId = input.user_id ?? createdBy;
    await (0, pool_1.query)(`INSERT INTO incident_work_logs (
      id, incident_id, user_id, work_date, duration_minutes, description, work_type, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        incidentId,
        userId,
        input.work_date,
        input.duration_minutes,
        input.description.trim(),
        input.work_type ?? null,
        createdBy,
    ]);
    const row = await (0, pool_1.queryOne)(`SELECT w.*, u.full_name AS user_name
     FROM incident_work_logs w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.id = ?`, [id]);
    if (!row)
        throw new errorHandler_1.AppError(500, 'Failed to create work log');
    return row;
}
async function deleteWorkLog(incidentId, workLogId) {
    await assertIncidentEditable(incidentId);
    const row = await (0, pool_1.queryOne)('SELECT id FROM incident_work_logs WHERE id = ? AND incident_id = ?', [
        workLogId,
        incidentId,
    ]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Darba ieraksts nav atrasts', 'NOT_FOUND');
    await (0, pool_1.query)('DELETE FROM incident_work_logs WHERE id = ?', [workLogId]);
}
async function listIncidentMaterials(incidentId) {
    return (0, pool_1.query)(`SELECT m.*, wi.name AS item_name, wi.unit AS item_unit, wi.sku AS item_sku,
            u.full_name AS used_by_name
     FROM incident_materials m
     JOIN warehouse_items wi ON wi.id = m.warehouse_item_id
     LEFT JOIN users u ON u.id = m.used_by
     WHERE m.incident_id = ?
     ORDER BY m.used_at DESC`, [incidentId]);
}
async function addIncidentMaterial(incidentId, input, usedBy) {
    await assertIncidentEditable(incidentId);
    const id = (0, uuid_1.v4)();
    await (0, warehouse_1.consumeStock)(input.warehouse_item_id, input.quantity, 'incident', id, usedBy, input.notes);
    try {
        await (0, pool_1.query)(`INSERT INTO incident_materials (
        id, incident_id, warehouse_item_id, quantity, notes, used_by
      ) VALUES (?, ?, ?, ?, ?, ?)`, [
            id,
            incidentId,
            input.warehouse_item_id,
            input.quantity,
            input.notes ?? null,
            usedBy,
        ]);
    }
    catch (err) {
        await (0, warehouse_1.returnStock)(input.warehouse_item_id, input.quantity, 'incident', id, usedBy);
        throw err;
    }
    const row = await (0, pool_1.queryOne)(`SELECT m.*, wi.name AS item_name, wi.unit AS item_unit, wi.sku AS item_sku,
            u.full_name AS used_by_name
     FROM incident_materials m
     JOIN warehouse_items wi ON wi.id = m.warehouse_item_id
     LEFT JOIN users u ON u.id = m.used_by
     WHERE m.id = ?`, [id]);
    if (!row)
        throw new errorHandler_1.AppError(500, 'Failed to record material');
    return row;
}
async function deleteIncidentMaterial(incidentId, materialId) {
    await assertIncidentEditable(incidentId);
    const row = await (0, pool_1.queryOne)('SELECT * FROM incident_materials WHERE id = ? AND incident_id = ?', [materialId, incidentId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Materiāla ieraksts nav atrasts', 'NOT_FOUND');
    await (0, warehouse_1.returnStock)(row.warehouse_item_id, Number(row.quantity), 'incident', materialId, row.used_by ?? undefined);
    await (0, pool_1.query)('DELETE FROM incident_materials WHERE id = ?', [materialId]);
}
async function getWorkSummary(incidentId) {
    const work = await (0, pool_1.queryOne)('SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM incident_work_logs WHERE incident_id = ?', [incidentId]);
    const mats = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incident_materials WHERE incident_id = ?', [incidentId]);
    return {
        total_minutes: Number(work?.total ?? 0),
        material_lines: Number(mats?.total ?? 0),
    };
}
//# sourceMappingURL=incidentWork.js.map