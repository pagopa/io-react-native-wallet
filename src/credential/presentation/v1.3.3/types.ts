import * as z from "zod";
import { UnixTime } from "../../../utils/zod";
import { jsonWebKeySchema } from "@openid-federation/core";

export type ClientMetadata = z.infer<typeof ClientMetadata>;
export const ClientMetadata = z.object({
  vp_formats_supported: z.string(),
  encrypted_response_enc_values_supported: z.array(z.string()),
  jwks: z.object({
    keys: z.array(jsonWebKeySchema),
  }),
  client_name: z.string().optional(),
  logo_uri: z.string().optional(),
});

export type TransactionData = z.infer<typeof TransactionData>;
export const TransactionData = z
  .array(
    z.object({
      type: z.string(),
      credential_ids: z.array(z.string()).nonempty(),
    })
  )
  .nonempty();

export type RequestObjectPayload = z.infer<typeof RequestObjectPayload>;
export const RequestObjectPayload = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string(),
  nonce: z.string(),
  response_uri: z.string(),
  request_uri_method: z.string().optional(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  client_metadata: ClientMetadata.optional(),
  transaction_data: TransactionData.optional(),
  transaction_data_hashes_alg: z.array(z.string()).optional(),
  dcql_query: z.record(z.string(), z.any()), // Validation happens within the `dcql` library, no need to duplicate it here
  scope: z.string().optional(),
});

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string().optional(),
  response_code: z.string().optional(),
  redirect_uri: z.string().optional(),
});
