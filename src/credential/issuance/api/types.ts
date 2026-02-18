import * as z from "zod";

export type CredentialFormat = "dc+sd-jwt" | "mso_mdoc";

// The credential as a collection of attributes in plain value
export type ParsedCredential = {
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
};

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
  expires_in: z.number().optional(),
  token_type: z.string(),
});
