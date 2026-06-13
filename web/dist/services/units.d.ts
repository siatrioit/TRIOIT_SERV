import type { Unit } from '../models/types';
import type { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import type { z } from 'zod';
type UnitInput = z.infer<typeof unitInputSchema>;
type UnitUpdate = z.infer<typeof unitUpdateSchema>;
export type UnitRow = Unit & {
    asset_type_code?: string | null;
};
export declare function assertObjectForClient(clientId: string, objectId: string): Promise<void>;
export declare function listUnitsForObject(clientId: string, objectId: string): Promise<UnitRow[]>;
export declare function getUnitForObject(clientId: string, objectId: string, unitId: string): Promise<UnitRow | null>;
export declare function createUnitForObject(clientId: string, objectId: string, input: UnitInput): Promise<UnitRow>;
export declare function updateUnitForObject(clientId: string, objectId: string, unitId: string, input: UnitUpdate): Promise<UnitRow | null>;
export declare function deleteUnitForObject(clientId: string, objectId: string, unitId: string): Promise<void>;
export declare function listPortalUnitsForObject(objectId: string, clientWideIds: string[], objectScopedIds: string[]): Promise<UnitRow[]>;
export declare function assertUnitForIncident(unitId: string, clientId: string, objectId: string): Promise<void>;
export declare function unitLabel(unit: Pick<UnitRow, 'unit_type' | 'serial_number' | 'model' | 'asset_type_name' | 'asset_component_name'>): string;
export {};
//# sourceMappingURL=units.d.ts.map