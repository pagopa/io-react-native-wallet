import { AuthorizationDetail } from "../../utils/par";
import * as z from "zod";

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TokenResponse = z.object({
  access_token: z.string(),
  authorization_details: z.array(AuthorizationDetail),
  expires_in: z.number(),
  token_type: z.string(),
});

export type CredentialResponse = z.infer<typeof CredentialResponse>;

export const CredentialResponse = z.object({
  credentials: z.array(
    z.object({
      credential: z.string(),
    })
  ),
  notification_id: z.string(),
});

/**
 * Shape from parsing a response given by a request uri during the EAA credential issuance flow with response mode "form_post.jwt".
 */
export const ResponseUriResultShape = z.object({
  redirect_uri: z.string(),
});

export type ResponseMode = "query" | "form_post.jwt";

export type NonceResponse = z.infer<typeof NonceResponse>;
export const NonceResponse = z.object({
  c_nonce: z.string(),
});
