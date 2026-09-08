import * as z from "zod";

import { UnixTime } from "../../../utils/zod";
import { ErrorResponse } from "../api/types";

export type RawRequestObject = z.infer<typeof RawRequestObject>;
export const RawRequestObject = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    trust_chain: z.array(z.string()).optional(),
    typ: z.literal("oauth-authz-req+jwt"),
  }),
  payload: z.object({
    client_id: z.string(),
    dcql_query: z.record(z.string(), z.any()), // Validation happens within the `dcql` library, no need to duplicate it here
    exp: UnixTime,
    iat: UnixTime,
    iss: z.string(),
    nonce: z.string(),
    request_uri_method: z.string().optional(),
    response_mode: z.literal("direct_post.jwt"),
    response_type: z.literal("vp_token"),
    response_uri: z.string(),
    scope: z.string().optional(),
    state: z.string(),
    wallet_nonce: z.string().optional(),
  }),
});

/**
 * Authorization Response payload sent to the Relying Party.
 */
export type DirectAuthorizationBodyPayload = z.infer<
  typeof DirectAuthorizationBodyPayload
>;
export const DirectAuthorizationBodyPayload = z.union([
  z.object({
    vp_token: z.record(z.string(), z.string()),
  }),
  z.object({ error: ErrorResponse, error_description: z.string() }),
]);

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  redirect_uri: z.string().optional(),
  response_code: z.string().optional(),
  status: z.string().optional(),
});
