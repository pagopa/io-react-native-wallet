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
