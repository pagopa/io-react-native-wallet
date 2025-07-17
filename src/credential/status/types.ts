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
export type ParsedStatusAssertion = z.infer<typeof ParsedStatusAssertion>;

/**
 * Shape for parsing a status attestation in a JWT.
 */
export const ParsedStatusAssertion = z.object({
  header: z.object({
    typ: z.literal("status-assertion+jwt"),
    alg: z.string(),
    kid: z.string().optional(),
  }),
  payload: z.object({
    iss: z.string(),
    credential_status_type: z.string(),
    credential_status_detail: z
      .object({
        state: z.string(),
        description: z.string(),
      })
      .optional(),
    credential_hash_alg: z.string(),
    credential_hash: z.string(),
    cnf: z.object({
      jwk: JWK,
    }),
    exp: UnixTime,
    iat: UnixTime,
  }),
});

export type ParsedStatusAssertionError = z.infer<
  typeof ParsedStatusAssertionError
>;

/**
 * The JWT that contains the errors occurred for the status assertion request.
 * @see https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/credential-revocation.html#http-status-assertion-response
 */
export const ParsedStatusAssertionError = z.object({
  header: z.object({
    typ: z.literal("status-assertion-error+jwt"),
    alg: z.string(),
    kid: z.string().optional(),
  }),
  payload: z.object({
    credential_hash_alg: z.string(),
    credential_hash: z.string(),
    error: z.string(),
    error_description: z.string(),
  }),
});

export type ParsedStatusAssertionResponse = z.infer<
  typeof ParsedStatusAssertionResponse
>;
export const ParsedStatusAssertionResponse = z.union([
  ParsedStatusAssertion,
  ParsedStatusAssertionError,
]);

export enum StatusType {
  VALID = "0x00",
  INVALID = "0x01",
  SUSPENDED = "0x02",
}

export type InvalidStatusErrorReason = {
  error: string;
  error_description: string;
};
