import type { Unit } from '../models/types';
import type { unitInputSchema, unitUpdateSchema } from '../schemas/unit';
import type { z } from 'zod';
type UnitInput = z.infer<typeof unitInputSchema>;
type UnitUpdate = z.infer<typeof unitUpdateSchema>;
export declare function assertObjectForClient(clientId: string, objectId: string): Promise<void>;
export declare function listUnitsForObject(clientId: string, objectId: string): Promise<Unit[]>;
export declare function getUnitForObject(clientId: string, objectId: string, unitId: string): Promise<Unit | null>;
export declare function createUnitForObject(clientId: string, objectId: string, input: UnitInput): Promise<Unit>;
export declare function updateUnitForObject(clientId: string, objectId: string, unitId: string, input: UnitUpdate): Promise<Unit | null>;
export declare function deleteUnitForObject(clientId: string, objectId: string, unitId: string): Promise<void>;
export declare function listPortalUnitsForObject(objectId: string, clientWideIds: string[], objectScopedIds: string[]): Promise<Unit[]>;
export declare function assertUnitForIncident(unitId: string, clientId: string, objectId: string): Promise<void>;
export declare function unitLabel(unit: Pick<Unit, 'unit_type' | 'serial_number' | 'model'>): string;
export {};
//# sourceMappingURL=units.d.ts.map