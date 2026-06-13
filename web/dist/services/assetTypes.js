"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActiveAssetTypes = listActiveAssetTypes;
exports.listAllAssetTypesAdmin = listAllAssetTypesAdmin;
exports.getAssetTypeById = getAssetTypeById;
exports.resolveAssetTypeId = resolveAssetTypeId;
exports.resolveAssetComponentId = resolveAssetComponentId;
exports.createAssetType = createAssetType;
exports.updateAssetType = updateAssetType;
exports.deleteAssetType = deleteAssetType;
exports.createAssetTypeComponent = createAssetTypeComponent;
exports.updateAssetTypeComponent = updateAssetTypeComponent;
exports.deleteAssetTypeComponent = deleteAssetTypeComponent;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
function slugifyCode(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'type';
}
async function listActiveAssetTypes(withComponents) {
    const types = await (0, pool_1.query)(`SELECT * FROM asset_types
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC`);
    if (!withComponents)
        return types;
    const components = await (0, pool_1.query)(`SELECT * FROM asset_type_components
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC`);
    const byType = new Map();
    for (const c of components) {
        const list = byType.get(c.asset_type_id) ?? [];
        list.push(c);
        byType.set(c.asset_type_id, list);
    }
    return types.map((t) => ({
        ...t,
        components: byType.get(t.id) ?? [],
    }));
}
async function listAllAssetTypesAdmin() {
    const types = await (0, pool_1.query)(`SELECT * FROM asset_types ORDER BY sort_order ASC, name ASC`);
    const components = await (0, pool_1.query)(`SELECT * FROM asset_type_components ORDER BY sort_order ASC, name ASC`);
    const byType = new Map();
    for (const c of components) {
        const list = byType.get(c.asset_type_id) ?? [];
        list.push(c);
        byType.set(c.asset_type_id, list);
    }
    return types.map((t) => ({ ...t, components: byType.get(t.id) ?? [] }));
}
async function getAssetTypeById(id) {
    return (0, pool_1.queryOne)('SELECT * FROM asset_types WHERE id = ?', [id]);
}
async function resolveAssetTypeId(assetTypeId, unitTypeCode) {
    if (assetTypeId) {
        const row = await (0, pool_1.queryOne)('SELECT id, code, name, is_active FROM asset_types WHERE id = ?', [assetTypeId]);
        if (!row || !row.is_active) {
            throw new errorHandler_1.AppError(400, 'Aktīva tips nav atrasts', 'INVALID_ASSET_TYPE');
        }
        return row;
    }
    if (unitTypeCode) {
        const row = await (0, pool_1.queryOne)('SELECT id, code, name, is_active FROM asset_types WHERE code = ?', [unitTypeCode]);
        if (!row || !row.is_active) {
            throw new errorHandler_1.AppError(400, 'Aktīva tips nav atrasts', 'INVALID_ASSET_TYPE');
        }
        return row;
    }
    throw new errorHandler_1.AppError(400, 'Norādiet aktīva tipu', 'INVALID_ASSET_TYPE');
}
async function resolveAssetComponentId(componentId, assetTypeId) {
    if (!componentId)
        return null;
    const row = await (0, pool_1.queryOne)('SELECT id, asset_type_id, is_active FROM asset_type_components WHERE id = ?', [componentId]);
    if (!row || !row.is_active || row.asset_type_id !== assetTypeId) {
        throw new errorHandler_1.AppError(400, 'Apakšsadaļa nav derīga šim tipam', 'INVALID_ASSET_COMPONENT');
    }
    return row.id;
}
async function createAssetType(input) {
    let code = input.code?.trim() || slugifyCode(input.name);
    const existingCode = await (0, pool_1.queryOne)('SELECT id FROM asset_types WHERE code = ?', [code]);
    if (existingCode) {
        code = `${code}_${Date.now().toString(36).slice(-4)}`;
    }
    const id = (0, uuid_1.v4)();
    const sortOrder = input.sort_order ?? 0;
    await (0, pool_1.query)(`INSERT INTO asset_types (id, code, name, sort_order) VALUES (?, ?, ?, ?)`, [id, code, input.name.trim(), sortOrder]);
    const row = await getAssetTypeById(id);
    return row;
}
async function updateAssetType(id, input) {
    const existing = await getAssetTypeById(id);
    if (!existing)
        return null;
    const fields = [];
    const values = [];
    if (input.name !== undefined) {
        fields.push('name = ?');
        values.push(input.name.trim());
    }
    if (input.sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(input.sort_order);
    }
    if (input.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
    }
    if (fields.length === 0)
        return existing;
    await (0, pool_1.query)(`UPDATE asset_types SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    return getAssetTypeById(id);
}
async function deleteAssetType(id) {
    const inUse = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM units WHERE asset_type_id = ?', [id]);
    if ((inUse?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Tipu nevar dzēst — ir saistīti aktīvi. Deaktivizējiet tipu.', 'ASSET_TYPE_IN_USE');
    }
    await (0, pool_1.query)('DELETE FROM asset_type_components WHERE asset_type_id = ?', [id]);
    await (0, pool_1.query)('DELETE FROM asset_types WHERE id = ?', [id]);
}
async function createAssetTypeComponent(assetTypeId, input) {
    const type = await getAssetTypeById(assetTypeId);
    if (!type)
        throw new errorHandler_1.AppError(404, 'Tips nav atrasts', 'NOT_FOUND');
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO asset_type_components (id, asset_type_id, name, sort_order) VALUES (?, ?, ?, ?)`, [id, assetTypeId, input.name.trim(), input.sort_order ?? 0]);
    const row = await (0, pool_1.queryOne)('SELECT * FROM asset_type_components WHERE id = ?', [id]);
    return row;
}
async function updateAssetTypeComponent(id, input) {
    const existing = await (0, pool_1.queryOne)('SELECT * FROM asset_type_components WHERE id = ?', [id]);
    if (!existing)
        return null;
    const fields = [];
    const values = [];
    if (input.name !== undefined) {
        fields.push('name = ?');
        values.push(input.name.trim());
    }
    if (input.sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(input.sort_order);
    }
    if (input.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
    }
    if (fields.length === 0)
        return existing;
    await (0, pool_1.query)(`UPDATE asset_type_components SET ${fields.join(', ')} WHERE id = ?`, [
        ...values,
        id,
    ]);
    return (0, pool_1.queryOne)('SELECT * FROM asset_type_components WHERE id = ?', [id]);
}
async function deleteAssetTypeComponent(id) {
    const inUseUnits = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM units WHERE asset_component_id = ?', [id]);
    const inUseIncidents = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incidents WHERE asset_component_id = ?', [id]);
    if ((inUseUnits?.total ?? 0) > 0 || (inUseIncidents?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Apakšsadaļu nevar dzēst — tā tiek izmantota. Deaktivizējiet to.', 'ASSET_COMPONENT_IN_USE');
    }
    await (0, pool_1.query)('DELETE FROM asset_type_components WHERE id = ?', [id]);
}
//# sourceMappingURL=assetTypes.js.map