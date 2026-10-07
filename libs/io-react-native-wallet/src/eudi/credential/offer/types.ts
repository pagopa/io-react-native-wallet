import * as z from "zod";

export const PRE_AUTHORIZED_CODE_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:pre-authorized_code";

const AuthorizationCodeGrant = z.object({
  authorization_server: z.url().optional(),
  issuer_state: z.string().optional(),
});

const PreAuthorizedCodeGrant = z.object({
  authorization_server: z.url().optional(),
  "pre-authorized_code": z.string(),
  tx_code: z
    .object({
      description: z.string().optional(),
      input_mode: z.enum(["numeric", "text"]).optional(),
      length: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Credential Offer as defined by OpenID4VCI 1.0, Section 4.1.1.
 * Unlike the IT-Wallet one, both the `authorization_code` and the
 * `pre-authorized_code` grants are accepted, and `grants` is optional.
 */
export const CredentialOffer = z.object({
  credential_configuration_ids: z.array(z.string()).nonempty(),
  credential_issuer: z.url(),
  grants: z
    .object({
      authorization_code: AuthorizationCodeGrant.optional(),
      [PRE_AUTHORIZED_CODE_GRANT_TYPE]: PreAuthorizedCodeGrant.optional(),
    })
    .optional(),
});

export type CredentialOffer = z.infer<typeof CredentialOffer>;

export interface ExtractGrantDetailsResult {
  authorizationCodeGrant?: {
    authorizationServer?: string;
    issuerState?: string;
  };
  preAuthorizedCodeGrant?: {
    authorizationServer?: string;
    preAuthorizedCode: string;
    txCode?: {
      description?: string;
      inputMode?: "numeric" | "text";
      length?: number;
    };
  };
}
