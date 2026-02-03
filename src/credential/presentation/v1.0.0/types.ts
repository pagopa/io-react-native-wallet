import * as z from "zod";
import { UnixTime } from "../../../utils/zod";
import { ErrorResponse } from "../api/types";

export type RequestObjectPayload = z.infer<typeof RequestObjectPayload>;
export const RequestObjectPayload = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string().optional(),
  nonce: z.string(),
  response_uri: z.string(),
  request_uri_method: z.string().optional(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  dcql_query: z.record(z.string(), z.any()), // Validation happens within the `dcql` library, no need to duplicate it here
  scope: z.string().optional(),
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
  status: z.string().optional(),
  response_code: z.string().optional(),
  redirect_uri: z.string().optional(),
});
