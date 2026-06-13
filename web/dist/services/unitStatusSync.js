"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUnitStatusFromIncident = syncUnitStatusFromIncident;
const pool_1 = require("../db/pool");
const incidentStatuses_1 = require("./incidentStatuses");
const units_1 = require("./units");
/**
 * Atjauno aktīva statusu pēc atgadījuma statusa konfigurācijas.
 * Noslēdzot atgadījumu, ja aktīvam ir citi atvērtie — ņem vērā jaunāko atvērto.
 */
async function syncUnitStatusFromIncident(params, actor) {
    const { unitId, clientId, objectId, incidentId, incidentStatus } = params;
    const statuses = await (0, incidentStatuses_1.listIncidentStatuses)(true);
    const byCode = (0, incidentStatuses_1.statusByCode)(statuses);
    const triggered = byCode.get(incidentStatus);
    if (!triggered)
        return;
    let targetUnitStatus = null;
    if (triggered.category === 'closed') {
        const openCodes = statuses.filter((s) => s.category === 'open').map((s) => s.code);
        if (openCodes.length > 0) {
            const placeholders = openCodes.map(() => '?').join(', ');
            const otherOpen = await (0, pool_1.queryOne)(`SELECT status FROM incidents
         WHERE unit_id = ? AND id != ? AND status IN (${placeholders})
         ORDER BY received_at DESC LIMIT 1`, [unitId, incidentId, ...openCodes]);
            if (otherOpen) {
                targetUnitStatus = byCode.get(otherOpen.status)?.sync_unit_status ?? null;
            }
        }
        if (!targetUnitStatus) {
            targetUnitStatus = triggered.sync_unit_status ?? null;
        }
    }
    else {
        targetUnitStatus = triggered.sync_unit_status ?? null;
    }
    if (!targetUnitStatus)
        return;
    const unit = await (0, units_1.getUnitForObject)(clientId, objectId, unitId);
    if (!unit || unit.status === targetUnitStatus)
        return;
    await (0, units_1.updateUnitForObject)(clientId, objectId, unitId, { status: targetUnitStatus }, actor);
}
//# sourceMappingURL=unitStatusSync.js.map