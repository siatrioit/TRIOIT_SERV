import { z } from 'zod';

/** Tukšas virknes no formas → undefined */
export function emptyToUndefined(val: unknown): unknown {
  if (val === '' || val === null) return undefined;
  return val;
}

export const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email().optional()
);

/** MySQL TINYINT (0/1) vai boolean */
export const boolish = z
  .union([z.boolean(), z.number(), z.string()])
  .transform((v) => v === true || v === 1 || v === '1' || v === 'true');
