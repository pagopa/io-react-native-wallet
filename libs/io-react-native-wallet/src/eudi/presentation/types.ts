import * as z from "zod";

import { JWK } from "../../utils/jwk";

/**
 * Verifier metadata sent in the Request Object (OpenID4VP 1.0, Section 5.1).
 * Only the parameters used by the wallet are validated.
 */
export const ClientMetadata = z.looseObject({
  client_name: z.string().optional(),
  encrypted_response_enc_values_supported: z.array(z.string()).optional(),
  jwks: z.object({ keys: z.array(z.looseObject(JWK.shape)) }).optional(),
  logo_uri: z.string().optional(),
  vp_formats_supported: z.record(z.string(), z.unknown()).optional(),
});
export type ClientMetadata = z.infer<typeof ClientMetadata>;

/**
 * Request Object of an OpenID4VP 1.0 Authorization Request (Section 5),
 * with the parameters supported by the wallet: DCQL queries and the
 * `direct_post` and `direct_post.jwt` Response Modes (Section 8.2 and 8.3).
 */
export const RequestObject = z.looseObject({
  client_id: z.string(),
  client_metadata: ClientMetadata.optional(),
  dcql_query: z.record(z.string(), z.unknown()),
  nonce: z.string().nonempty(),
  response_mode: z.enum(["direct_post", "direct_post.jwt"]),
  response_type: z.literal("vp_token"),
  response_uri: z.url(),
  state: z.string().optional(),
  transaction_data: z.array(z.string()).optional(),
  wallet_nonce: z.string().optional(),
});
export type RequestObject = z.infer<typeof RequestObject>;

export const RequestObjectHeader = z.looseObject({
  alg: z.string(),
  typ: z.literal("oauth-authz-req+jwt"),
  x5c: z.tuple([z.string()], z.string()).optional(),
});

/**
 * Response of the Verifier to the Authorization Response (OpenID4VP 1.0, Section 8.2).
 */
export const AuthorizationResponseResult = z.looseObject({
  redirect_uri: z.string().optional(),
});
/**
 * Error codes the wallet can send to the Verifier (OpenID4VP 1.0, Section 8.5).
 */
export type AuthorizationErrorCode =
  | "access_denied"
  | "invalid_client"
  | "invalid_request"
  | "invalid_request_object"
  | "invalid_request_uri"
  | "vp_formats_not_supported";

export type AuthorizationResponseResult = z.infer<
  typeof AuthorizationResponseResult
>;
