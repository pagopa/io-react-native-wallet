import * as z from "zod";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;

export type CredentialFormat = "dc+sd-jwt" | "mso_mdoc";

// The credential as a collection of attributes in plain value
export interface ParsedCredential {
  /** Attribute key */
  [claim: string]: {
    name:
      | /* if i18n is provided */ Record<
          string /* locale */,
          string /* value */
        >
      | /* if no i18n is provided */ string
      | undefined; // Add undefined as a possible value for the name property
    value: unknown;
  };
}
export const AuthorizationDetail = z.object({
  credential_configuration_id: z.string(),
  credential_identifiers: z.array(z.string()),
  type: z.literal("openid_credential"),
});

export type TokenResponse = z.infer<typeof TokenResponse>;
export const TokenResponse = z.object({
  access_token: z.string(),
  authorization_details: z.array(AuthorizationDetail),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
});
