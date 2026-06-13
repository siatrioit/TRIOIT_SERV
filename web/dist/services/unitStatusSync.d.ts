import { type UnitActor } from './unitActivity';
/**
 * Atjauno aktīva statusu pēc atgadījuma statusa konfigurācijas.
 * Noslēdzot atgadījumu, ja aktīvam ir citi atvērtie — ņem vērā jaunāko atvērto.
 */
export declare function syncUnitStatusFromIncident(params: {
    unitId: string;
    clientId: string;
    objectId: string;
    incidentId: string;
    incidentStatus: string;
}, actor?: UnitActor | null): Promise<void>;
//# sourceMappingURL=unitStatusSync.d.ts.map