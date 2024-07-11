import { AuthorizationDetail } from "../../utils/par";
import * as z from "zod";
import { SupportedCredentialFormat } from "./const";

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TokenResponse = z.object({
  access_token: z.string(),
  authorization_details: z.array(AuthorizationDetail),
  c_nonce: z.string(),
  c_nonce_expires_in: z.number(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type CredentialResponse = z.infer<typeof CredentialResponse>;

export const CredentialResponse = z.object({
  c_nonce: z.string(),
  c_nonce_expires_in: z.number(),
  credential: z.string(),
  format: SupportedCredentialFormat,
});

/**
 * Shape from parsing a response given by a request uri during the EAA credential issuance flow with response mode "form_post.jwt".
 */
export const ResponseUriResultShape = z.object({
  redirect_uri: z.string(),
});

export type ResponseMode = "query" | "form_post.jwt";
