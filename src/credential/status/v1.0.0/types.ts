import * as z from "zod";

import { JWK } from "../../../utils/jwk";
import { UnixTime } from "../../../utils/zod";

/**
 * Shape from parsing a status assertion response in case of 201.
 */
export const StatusAssertionResponse = z.object({
  status_assertion_responses: z.array(z.string()),
});

export type ParsedStatusAssertionJwt = z.infer<typeof ParsedStatusAssertionJwt>;

/**
 * Type from parsing a status assertion response in case of 201.
 * Inferred from {@link StatusAssertionResponse}.
 */
export type StatusAssertionResponse = z.infer<typeof StatusAssertionResponse>;

/**
 * Shape for parsing a successful status assertion in a JWT.
 */
export const ParsedStatusAssertionJwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string().optional(),
    typ: z.literal("status-assertion+jwt"),
  }),
  payload: z.object({
    cnf: z.object({
      jwk: JWK,
    }),
    credential_hash: z.string(),
    credential_hash_alg: z.string(),
    credential_status_detail: z
      .object({
        description: z.string(),
        state: z.string(),
      })
      .optional(),
    credential_status_type: z.string(),
    exp: UnixTime,
    iat: UnixTime,
    iss: z.string(),
  }),
});

export type ParsedStatusAssertionErrorJwt = z.infer<
  typeof ParsedStatusAssertionErrorJwt
>;

/**
 * The JWT that contains the errors occurred for the status assertion request.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.0.1/en/credential-revocation.html#http-status-assertion-response
 */
export const ParsedStatusAssertionErrorJwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string().optional(),
    typ: z.literal("status-assertion-error+jwt"),
  }),
  payload: z.object({
    credential_hash: z.string(),
    credential_hash_alg: z.string(),
    error: z.string(),
    error_description: z.string(),
  }),
});

/**
 * The status assertion response that might include either a successful assertion or an error
 */
export type ParsedStatusAssertionResponse = z.infer<
  typeof ParsedStatusAssertionResponse
>;
export const ParsedStatusAssertionResponse = z.union([
  ParsedStatusAssertionJwt,
  ParsedStatusAssertionErrorJwt,
]);

export enum StatusType {
  INVALID = "0x01",
  SUSPENDED = "0x02",
  VALID = "0x00",
}

export interface InvalidStatusErrorReason {
  error: string;
  error_description: string;
}
