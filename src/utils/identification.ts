import * as z from "zod";

/**
 * The result of the identification process.
 */
export const IdentificationResultShape = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string().optional(),
});

/**
 * Type of the identification result.
 */
export type IdentificationResult = z.infer<typeof IdentificationResultShape>;
