import * as z from "zod";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;
export const AuthorizationDetail = z.object({
  type: z.literal("openid_credential"),
  credential_configuration_id: z.string(),
  credential_identifiers: z.array(z.string()),
});

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
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
  notification_id: z.string().optional(),
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
