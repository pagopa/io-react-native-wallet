import * as z from "zod";
import { AuthorizationDetail, TokenResponse } from "../api/types";

// Reusing the following API types because they are the same in v1.0.0
export { AuthorizationDetail, TokenResponse };

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

export type NonceResponse = z.infer<typeof NonceResponse>;
export const NonceResponse = z.object({
  c_nonce: z.string(),
});
