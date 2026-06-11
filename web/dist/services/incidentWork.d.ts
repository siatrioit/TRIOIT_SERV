import type { IncidentMaterial, IncidentWorkLog } from '../models/types';
import type { incidentMaterialInputSchema, workLogInputSchema } from '../schemas/warehouse';
import type { z } from 'zod';
type WorkLogInput = z.infer<typeof workLogInputSchema>;
type MaterialInput = z.infer<typeof incidentMaterialInputSchema>;
export declare function listWorkLogs(incidentId: string): Promise<IncidentWorkLog[]>;
export declare function addWorkLog(incidentId: string, input: WorkLogInput, createdBy: string): Promise<IncidentWorkLog>;
export declare function deleteWorkLog(incidentId: string, workLogId: string): Promise<void>;
export declare function listIncidentMaterials(incidentId: string): Promise<IncidentMaterial[]>;
export declare function addIncidentMaterial(incidentId: string, input: MaterialInput, usedBy: string): Promise<IncidentMaterial>;
export declare function deleteIncidentMaterial(incidentId: string, materialId: string): Promise<void>;
export declare function getWorkSummary(incidentId: string): Promise<{
    total_minutes: number;
    material_lines: number;
}>;
export {};
//# sourceMappingURL=incidentWork.d.ts.map