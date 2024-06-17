import * as z from "zod";

/**
 * Context for identification during the {@link 03-start-user-authorization.ts} phase.
 * It consists of a single method to identify the user which takes a URL and a redirect schema as input.
 * Once the identification is completed and the URL calls the redirect schema, the method should return the redirect URL.
 */
export interface IdentificationContext {
  identify: (url: string, redirectSchema: string) => Promise<string>;
}

/**
 * The result of the identification process.
 */
export const IdentificationResultShape = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});

/**
 * Type of the identification result.
 */
export type IdentificationResult = z.infer<typeof IdentificationResultShape>;
