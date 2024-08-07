import * as z from "zod";

/**
 * Shape from parsing a status attestation response in case of 201.
 */
export const StatusAttestationResponse = z.object({
  status_attestation: z.string(),
});

/**
 * Type from parsing a status attestation response in case of 201.
 * Inferred from {@link StatusAttestationResponse}.
 */
export type StatusAttestationResponse = z.infer<
  typeof StatusAttestationResponse
>;
