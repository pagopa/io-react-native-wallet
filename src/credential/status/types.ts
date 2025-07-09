import { UnixTime } from "../../sd-jwt/types";
import { JWK } from "../../utils/jwk";
import * as z from "zod";

/**
 * Shape from parsing a status attestation response in case of 201.
 */
export const StatusAttestationResponse = z.object({
  status_assertion_responses: z.array(z.string()),
});

/**
 * Type from parsing a status attestation response in case of 201.
 * Inferred from {@link StatusAttestationResponse}.
 */
export type StatusAttestationResponse = z.infer<
  typeof StatusAttestationResponse
>;

/**
 * Type for a parsed status attestation.
 */
export type ParsedStatusAttestation = z.infer<typeof ParsedStatusAttestation>;

/**
 * Shape for parsing a status attestation in a JWT.
 */
export const ParsedStatusAttestation = z.object({
  header: z.object({
    typ: z.literal("status-attestation+jwt"),
    alg: z.string(),
    kid: z.string().optional(),
  }),
  payload: z.object({
    credential_hash_alg: z.string(),
    credential_hash: z.string(),
    cnf: z.object({
      jwk: JWK,
    }),
    exp: UnixTime,
    iat: UnixTime,
  }),
});
