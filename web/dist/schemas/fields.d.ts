import { z } from 'zod';
/** Tukšas virknes no formas → undefined */
export declare function emptyToUndefined(val: unknown): unknown;
export declare const optionalString: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
export declare const optionalEmail: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
/** MySQL TINYINT (0/1) vai boolean */
export declare const boolish: z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>, boolean, string | number | boolean>;
//# sourceMappingURL=fields.d.ts.map