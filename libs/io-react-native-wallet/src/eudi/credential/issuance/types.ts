import * as z from "zod";

/**
 * Credential Issuer Metadata (OpenID4VCI 1.0, Section 12.2.4).
 * Only the parameters used by the wallet are validated.
 */
const Logo = z.looseObject({
  alt_text: z.string().optional(),
  uri: z.string(),
});

const ClaimPath = z.array(z.union([z.string(), z.number(), z.null()]));
export type ClaimPath = z.infer<typeof ClaimPath>;

/**
 * Display metadata of a credential (OpenID4VCI 1.0, Appendix A.1).
 * Malformed display metadata is ignored, since it must not prevent the issuance.
 */
const CredentialMetadata = z
  .looseObject({
    claims: z
      .array(
        z.looseObject({
          display: z
            .array(
              z.looseObject({
                locale: z.string().optional(),
                name: z.string().optional(),
              }),
            )
            .optional(),
          path: ClaimPath,
        }),
      )
      .optional(),
    display: z
      .array(
        z.looseObject({
          background_color: z.string().optional(),
          locale: z.string().optional(),
          logo: Logo.optional(),
          name: z.string(),
          text_color: z.string().optional(),
        }),
      )
      .optional(),
  })
  .optional()
  .catch(undefined);

export const CredentialIssuerMetadata = z.looseObject({
  authorization_servers: z.array(z.url()).nonempty().optional(),
  credential_configurations_supported: z.record(
    z.string(),
    z.looseObject({
      credential_metadata: CredentialMetadata,
      format: z.string(),
      scope: z.string().optional(),
    }),
  ),
  credential_endpoint: z.url(),
  credential_issuer: z.url(),
  display: z
    .array(
      z.looseObject({
        locale: z.string().optional(),
        logo: Logo.optional(),
        name: z.string().optional(),
      }),
    )
    .optional()
    .catch(undefined),
  nonce_endpoint: z.url().optional(),
});
export type CredentialIssuerMetadata = z.infer<typeof CredentialIssuerMetadata>;

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414, Section 2).
 * Only the parameters used by the wallet are validated.
 */
export const AuthorizationServerMetadata = z.looseObject({
  authorization_endpoint: z.url(),
  authorization_response_iss_parameter_supported: z.boolean().optional(),
  issuer: z.url(),
  pushed_authorization_request_endpoint: z.url().optional(),
  require_pushed_authorization_requests: z.boolean().optional(),
  token_endpoint: z.url(),
});
export type AuthorizationServerMetadata = z.infer<
  typeof AuthorizationServerMetadata
>;

export const ParResponse = z.object({
  expires_in: z.number(),
  request_uri: z.string(),
});

/**
 * Token Response (OpenID4VCI 1.0, Section 6.2).
 */
export const TokenResponse = z.looseObject({
  access_token: z.string(),
  authorization_details: z
    .array(
      z.looseObject({
        credential_configuration_id: z.string().optional(),
        credential_identifiers: z.array(z.string()),
        type: z.literal("openid_credential"),
      }),
    )
    .optional(),
  expires_in: z.number().optional(),
  token_type: z.string(),
});
export type TokenResponse = z.infer<typeof TokenResponse>;

export const NonceResponse = z.object({
  c_nonce: z.string(),
});

/**
 * Credential Response (OpenID4VCI 1.0, Section 8.3).
 */
export const CredentialResponse = z.looseObject({
  credentials: z
    .array(z.looseObject({ credential: z.string() }))
    .nonempty()
    .optional(),
  transaction_id: z.string().optional(),
});

export type ParsedCredential = {
  /** Disclosed claims for `dc+sd-jwt`, claims grouped by namespace for `mso_mdoc` */
  claims: Record<string, unknown>;
  format: string;
};
