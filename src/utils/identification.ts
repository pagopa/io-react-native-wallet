import * as z from "zod";

export interface IdentificationContext {
  identify: (url: string, redirectSchema: string) => Promise<string>;
}

export const IdentificationResultShape = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});

export type IdentificationResult = z.infer<typeof IdentificationResultShape>;
