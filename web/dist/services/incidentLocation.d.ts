import { z } from 'zod';
type IncidentLocationInput = {
    client_id: string;
    object_id?: string;
    unit_id?: string;
};
export declare function resolveIncidentLocation(input: IncidentLocationInput): Promise<{
    client_id: string;
    object_id: string | null;
    unit_id: string | null;
}>;
export declare const incidentLocationSchema: z.ZodObject<{
    client_id: z.ZodString;
    object_id: z.ZodOptional<z.ZodString>;
    unit_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    object_id?: string | undefined;
    unit_id?: string | undefined;
}, {
    client_id: string;
    object_id?: string | undefined;
    unit_id?: string | undefined;
}>;
export {};
//# sourceMappingURL=incidentLocation.d.ts.map