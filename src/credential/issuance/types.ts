import * as z from "zod";
import { SupportedCredentialFormat } from "./const";
import { OpenConnectCredentialFormat } from "../../entity/connect-discovery/types";

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TokenResponse = z.object({
  token_type: z.literal("Bearer"),
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  authorization_details: z.array(
    z.object({
      credential_configuration_id: z.string(),
      format: OpenConnectCredentialFormat,
      type: z.literal("openid_credential"),
      credential_identifiers: z.array(z.string()).optional(),
    })
  ),
  c_nonce: z.string().optional(),
  c_nonce_expires_in: z.string().optional(),
});

export type CredentialResponse = z.infer<typeof CredentialResponse>;

export const CredentialResponse = z.object({
  c_nonce: z.string().optional(),
  c_nonce_expires_in: z.number().optional(),
  credential: z.string().optional(),
  notification_id: z.string().optional(), // this must not be present if the credential is deferred
});

/**
 * Shape from parsing a response given by a request uri during the EAA credential issuance flow with response mode "form_post.jwt".
 */
export const ResponseUriResultShape = z.object({
  redirect_uri: z.string(),
});

export type ResponseMode = "query" | "form_post.jwt";
