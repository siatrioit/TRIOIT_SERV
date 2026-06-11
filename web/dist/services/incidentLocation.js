"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentLocationSchema = void 0;
exports.resolveIncidentLocation = resolveIncidentLocation;
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const units_1 = require("./units");
async function resolveIncidentLocation(input) {
    let objectId = input.object_id ?? null;
    const unitId = input.unit_id ?? null;
    if (unitId) {
        const unit = await (0, pool_1.queryOne)('SELECT client_id, object_id FROM units WHERE id = ?', [unitId]);
        if (!unit)
            throw new errorHandler_1.AppError(400, 'Ierīce nav atrasta', 'INVALID_UNIT');
        if (unit.client_id !== input.client_id) {
            throw new errorHandler_1.AppError(400, 'Ierīce nepieder šim klientam', 'INVALID_UNIT');
        }
        if (objectId && unit.object_id && unit.object_id !== objectId) {
            throw new errorHandler_1.AppError(400, 'Ierīce nepieder šim objektam', 'INVALID_UNIT');
        }
        objectId = unit.object_id ?? objectId;
        if (objectId) {
            await (0, units_1.assertUnitForIncident)(unitId, input.client_id, objectId);
        }
    }
    if (objectId) {
        const object = await (0, pool_1.queryOne)(`SELECT id FROM client_objects
       WHERE id = ? AND client_id = ? AND is_active = 1 AND status = 'active'`, [objectId, input.client_id]);
        if (!object)
            throw new errorHandler_1.AppError(400, 'Objekts nav pieejams', 'INVALID_OBJECT');
    }
    return { client_id: input.client_id, object_id: objectId, unit_id: unitId };
}
exports.incidentLocationSchema = zod_1.z.object({
    client_id: zod_1.z.string().uuid(),
    object_id: zod_1.z.string().uuid().optional(),
    unit_id: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=incidentLocation.js.map