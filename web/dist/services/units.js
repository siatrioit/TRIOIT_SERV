"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertObjectForClient = assertObjectForClient;
exports.listUnitsForObject = listUnitsForObject;
exports.getUnitForObject = getUnitForObject;
exports.createUnitForObject = createUnitForObject;
exports.updateUnitForObject = updateUnitForObject;
exports.deleteUnitForObject = deleteUnitForObject;
exports.listPortalUnitsForObject = listPortalUnitsForObject;
exports.assertUnitForIncident = assertUnitForIncident;
exports.unitLabel = unitLabel;
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const assetTypes_1 = require("./assetTypes");
const unitActivity_1 = require("./unitActivity");
const UNIT_STATUS_LABELS = {
    active: 'Aktīva',
    repair: 'Remontā',
    decommissioned: 'Izņemta',
    spare: 'Rezerve',
};
const UNIT_SELECT = `
  u.*,
  at.name AS asset_type_name,
  at.code AS asset_type_code,
  ac.name AS asset_component_name,
  pu.serial_number AS parent_serial_number,
  pac.name AS parent_component_name
`;
const UNIT_JOINS = `
  LEFT JOIN asset_types at ON at.id = u.asset_type_id
  LEFT JOIN asset_type_components ac ON ac.id = u.asset_component_id
  LEFT JOIN units pu ON pu.id = u.parent_unit_id
  LEFT JOIN asset_type_components pac ON pac.id = pu.asset_component_id
`;
async function getMainUnitForObject(clientId, objectId, parentUnitId) {
    const parent = await (0, pool_1.queryOne)(`SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.id = ? AND u.client_id = ? AND u.object_id = ? AND u.parent_unit_id IS NULL`, [parentUnitId, clientId, objectId]);
    if (!parent) {
        throw new errorHandler_1.AppError(400, 'Galvenais aktīvs nav atrasts', 'INVALID_PARENT');
    }
    return parent;
}
async function resolveUnitFields(clientId, objectId, input, existing) {
    const parentUnitId = input.parent_unit_id !== undefined
        ? input.parent_unit_id
        : existing?.parent_unit_id ?? null;
    if (parentUnitId) {
        const parent = await getMainUnitForObject(clientId, objectId, parentUnitId);
        if (!input.asset_component_id && !existing?.asset_component_id) {
            throw new errorHandler_1.AppError(400, 'Apakšaktīvam jānorāda apakšsadaļa', 'INVALID_COMPONENT');
        }
        const componentId = await (0, assetTypes_1.resolveAssetComponentId)(input.asset_component_id !== undefined
            ? input.asset_component_id
            : existing?.asset_component_id, parent.asset_type_id);
        return {
            assetTypeId: parent.asset_type_id,
            unitTypeCode: parent.unit_type,
            assetComponentId: componentId,
            parentUnitId,
        };
    }
    const assetType = await (0, assetTypes_1.resolveAssetTypeId)(input.asset_type_id ?? existing?.asset_type_id ?? undefined, input.unit_type ?? existing?.unit_type);
    const componentId = await (0, assetTypes_1.resolveAssetComponentId)(input.asset_component_id !== undefined
        ? input.asset_component_id
        : existing?.asset_component_id, assetType.id);
    return {
        assetTypeId: assetType.id,
        unitTypeCode: assetType.code,
        assetComponentId: componentId,
        parentUnitId: null,
    };
}
function unitSummary(unit) {
    const type = unit.asset_type_name || 'Aktīvs';
    const component = unit.asset_component_name ? ` (${unit.asset_component_name})` : '';
    return `${type}${component} · ${unit.serial_number}`;
}
async function assertObjectForClient(clientId, objectId) {
    const row = await (0, pool_1.queryOne)(`SELECT id FROM client_objects
     WHERE id = ? AND client_id = ? AND is_active = 1`, [objectId, clientId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
}
async function listUnitsForObject(clientId, objectId) {
    await assertObjectForClient(clientId, objectId);
    return (0, pool_1.query)(`SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.client_id = ? AND u.object_id = ?
     ORDER BY
       CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
       COALESCE(pu.serial_number, u.serial_number) ASC,
       u.serial_number ASC`, [clientId, objectId]);
}
async function getUnitForObject(clientId, objectId, unitId) {
    return (0, pool_1.queryOne)(`SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.id = ? AND u.client_id = ? AND u.object_id = ?`, [unitId, clientId, objectId]);
}
async function createUnitForObject(clientId, objectId, input, actor) {
    await assertObjectForClient(clientId, objectId);
    const dup = await (0, pool_1.queryOne)('SELECT id FROM units WHERE serial_number = ?', [
        input.serial_number,
    ]);
    if (dup) {
        throw new errorHandler_1.AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
    }
    const resolved = await resolveUnitFields(clientId, objectId, input);
    const id = (0, uuid_1.v4)();
    await (0, pool_1.query)(`INSERT INTO units (
      id, client_id, object_id, parent_unit_id, unit_type, asset_type_id, asset_component_id,
      serial_number, model, manufacturer, status, location_note, installed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        clientId,
        objectId,
        resolved.parentUnitId,
        resolved.unitTypeCode,
        resolved.assetTypeId,
        resolved.assetComponentId,
        input.serial_number.trim(),
        input.model ?? null,
        input.manufacturer ?? null,
        input.status,
        input.location_note ?? null,
        input.installed_at || null,
        input.notes ?? null,
    ]);
    const unit = await getUnitForObject(clientId, objectId, id);
    if (resolved.parentUnitId && unit) {
        const parent = await getUnitForObject(clientId, objectId, resolved.parentUnitId);
        await (0, unitActivity_1.logUnitActivity)(id, 'linked_to_parent', `Pievienots pie galvenā aktīva: ${unitSummary(parent)}`, actor);
    }
    await (0, unitActivity_1.logUnitActivity)(id, 'created', resolved.parentUnitId ? 'Izveidots apakšaktīvs' : 'Izveidots galvenais aktīvs', actor, { serial_number: input.serial_number.trim() });
    return unit;
}
async function updateUnitForObject(clientId, objectId, unitId, input, actor) {
    const existing = await getUnitForObject(clientId, objectId, unitId);
    if (!existing)
        return null;
    if (existing.parent_unit_id === null) {
        const childCount = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?', [unitId]);
        if ((childCount?.total ?? 0) > 0 && input.parent_unit_id) {
            throw new errorHandler_1.AppError(400, 'Galvenajam aktīvam ar apakšaktīviem nevar mainīt tipu uz apakšaktīvu', 'HAS_CHILDREN');
        }
    }
    const childUnits = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?', [unitId]);
    if ((childUnits?.total ?? 0) > 0 && input.parent_unit_id) {
        throw new errorHandler_1.AppError(400, 'Aktīvam ar apakšaktīviem nevar piešķirt jaunu galveno aktīvu', 'HAS_CHILDREN');
    }
    if (input.serial_number && input.serial_number !== existing.serial_number) {
        const dup = await (0, pool_1.queryOne)('SELECT id FROM units WHERE serial_number = ? AND id != ?', [
            input.serial_number,
            unitId,
        ]);
        if (dup) {
            throw new errorHandler_1.AppError(409, 'Sērijas numurs jau reģistrēts', 'SERIAL_EXISTS');
        }
    }
    const resolved = await resolveUnitFields(clientId, objectId, {
        asset_type_id: input.asset_type_id,
        unit_type: input.unit_type,
        asset_component_id: input.asset_component_id,
        parent_unit_id: input.parent_unit_id,
    }, existing);
    const updates = {
        ...input,
        unit_type: resolved.unitTypeCode,
        asset_type_id: resolved.assetTypeId,
        asset_component_id: resolved.assetComponentId,
        parent_unit_id: resolved.parentUnitId,
    };
    const fields = Object.keys(updates).filter((k) => updates[k] !== undefined);
    if (fields.length === 0)
        return existing;
    if (input.parent_unit_id !== undefined &&
        input.parent_unit_id !== existing.parent_unit_id) {
        if (input.parent_unit_id && !existing.parent_unit_id) {
            const parent = await getUnitForObject(clientId, objectId, input.parent_unit_id);
            await (0, unitActivity_1.logUnitActivity)(unitId, 'linked_to_parent', `Pievienots pie galvenā aktīva: ${unitSummary(parent)}`, actor);
        }
        else if (!input.parent_unit_id && existing.parent_unit_id) {
            await (0, unitActivity_1.logUnitActivity)(unitId, 'unlinked_from_parent', 'Atvienots no galvenā aktīva', actor);
        }
        else if (input.parent_unit_id && existing.parent_unit_id) {
            const oldParent = await getUnitForObject(clientId, objectId, existing.parent_unit_id);
            const newParent = await getUnitForObject(clientId, objectId, input.parent_unit_id);
            await (0, unitActivity_1.logUnitActivity)(unitId, 'moved_to_parent', `Pārvietots no „${unitSummary(oldParent)}” uz „${unitSummary(newParent)}”`, actor);
        }
    }
    if (input.status !== undefined && input.status !== existing.status) {
        await (0, unitActivity_1.logUnitActivity)(unitId, 'status_changed', `Statuss: ${UNIT_STATUS_LABELS[existing.status] || existing.status} → ${UNIT_STATUS_LABELS[input.status] || input.status}`, actor);
    }
    const otherFields = fields.filter((f) => !['parent_unit_id', 'status', 'asset_type_id', 'unit_type', 'asset_component_id'].includes(f) &&
        (updates[f] ?? null) !== (existing[f] ?? null));
    if (otherFields.length > 0) {
        await (0, unitActivity_1.logUnitActivity)(unitId, 'updated', 'Laboti aktīva dati', actor, {
            fields: otherFields,
        });
    }
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => {
        const v = updates[f];
        if (f === 'serial_number' && typeof v === 'string')
            return v.trim();
        return v ?? null;
    });
    await (0, pool_1.query)(`UPDATE units SET ${setClause} WHERE id = ?`, [...values, unitId]);
    return getUnitForObject(clientId, objectId, unitId);
}
async function deleteUnitForObject(clientId, objectId, unitId, actor) {
    const existing = await getUnitForObject(clientId, objectId, unitId);
    if (!existing)
        throw new errorHandler_1.AppError(404, 'Unit not found', 'NOT_FOUND');
    const children = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM units WHERE parent_unit_id = ?', [unitId]);
    if ((children?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Nevar dzēst galveno aktīvu — vispirms noņemiet vai pārvietojiet apakšaktīvus.', 'HAS_CHILDREN');
    }
    const incidents = await (0, pool_1.queryOne)('SELECT COUNT(*) AS total FROM incidents WHERE unit_id = ?', [unitId]);
    if ((incidents?.total ?? 0) > 0) {
        throw new errorHandler_1.AppError(409, 'Vienību nevar dzēst — ir saistīti izsaukumi. Mainiet statusu uz „Izņemta”.', 'HAS_INCIDENTS');
    }
    await (0, unitActivity_1.logUnitActivity)(unitId, 'deleted', existing.parent_unit_id ? 'Apakšaktīvs dzēsts' : 'Galvenais aktīvs dzēsts', actor);
    await (0, pool_1.query)('DELETE FROM units WHERE id = ?', [unitId]);
}
async function listPortalUnitsForObject(objectId, clientWideIds, objectScopedIds) {
    const object = await (0, pool_1.queryOne)(`SELECT id, client_id, status FROM client_objects
     WHERE id = ? AND is_active = 1 AND status = 'active'`, [objectId]);
    if (!object)
        throw new errorHandler_1.AppError(404, 'Object not found', 'NOT_FOUND');
    const canAccess = clientWideIds.includes(object.client_id) || objectScopedIds.includes(objectId);
    if (!canAccess)
        throw new errorHandler_1.AppError(403, 'Nav pieejas šim objektam', 'FORBIDDEN');
    return (0, pool_1.query)(`SELECT ${UNIT_SELECT}
     FROM units u
     ${UNIT_JOINS}
     WHERE u.object_id = ? AND u.status IN ('active', 'repair')
     ORDER BY
       CASE WHEN u.parent_unit_id IS NULL THEN 0 ELSE 1 END,
       COALESCE(pu.serial_number, u.serial_number) ASC,
       u.serial_number ASC`, [objectId]);
}
async function assertUnitForIncident(unitId, clientId, objectId) {
    const unit = await (0, pool_1.queryOne)(`SELECT id FROM units
     WHERE id = ? AND client_id = ? AND object_id = ?
       AND status IN ('active', 'repair')`, [unitId, clientId, objectId]);
    if (!unit) {
        throw new errorHandler_1.AppError(400, 'Ierīce nav pieejama šim objektam', 'INVALID_UNIT');
    }
}
function unitLabel(unit) {
    if (unit.parent_unit_id && unit.asset_component_name) {
        const model = unit.model ? ` ${unit.model}` : '';
        return `${unit.asset_component_name}${model} · ${unit.serial_number}`;
    }
    const type = unit.asset_type_name || unit.unit_type;
    const model = unit.model ? ` ${unit.model}` : '';
    return `${type}${model} · ${unit.serial_number}`;
}
//# sourceMappingURL=units.js.map