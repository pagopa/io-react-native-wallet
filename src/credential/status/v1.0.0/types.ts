import { UnixTime } from "../../../utils/zod";
import { JWK } from "../../../utils/jwk";
import * as z from "zod";

/**
 * Shape from parsing a status assertion response in case of 201.
 */
export const StatusAssertionResponse = z.object({
  status_assertion_responses: z.array(z.string()),
});

/**
 * Type from parsing a status assertion response in case of 201.
 * Inferred from {@link StatusAssertionResponse}.
 */
export type StatusAssertionResponse = z.infer<typeof StatusAssertionResponse>;

export type ParsedStatusAssertionJwt = z.infer<typeof ParsedStatusAssertionJwt>;

/**
 * Shape for parsing a successful status assertion in a JWT.
 */
export const ParsedStatusAssertionJwt = z.object({
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

export type ParsedStatusAssertionErrorJwt = z.infer<
  typeof ParsedStatusAssertionErrorJwt
>;

/**
 * The JWT that contains the errors occurred for the status assertion request.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.0.1/en/credential-revocation.html#http-status-assertion-response
 */
export const ParsedStatusAssertionErrorJwt = z.object({
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
  VALID = "0x00",
  INVALID = "0x01",
  SUSPENDED = "0x02",
}

export type InvalidStatusErrorReason = {
  error: string;
  error_description: string;
};
