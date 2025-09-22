import { JWK } from "../../../utils/jwk";
import { pathInsert } from "../../../utils/misc";
import * as z from "zod";

// Display metadata for a credential, used by the issuer to
// instruct the Wallet Solution on how to render the credential correctly
export type CredentialDisplay = z.infer<typeof CredentialDisplay>;
export const CredentialDisplay = z.object({
  name: z.string(),
  locale: z.string(),
  logo: z
    .object({
      uri: z.string(),
      alt_text: z.string(),
    })
    .optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
});

export const CredentialClaimDisplay = z.object({
  name: z.string(),
  locale: z.string(),
});

export const CredentialFormat = z.union([
  z.literal("vc+sd-jwt"),
  z.literal("dc+sd-jwt"),
  z.literal("mso_mdoc"),
]);

export type CredentialClaim = z.infer<typeof CredentialClaim>;
export const CredentialClaim = z.object({
  mandatory: z.boolean(),
  display: z.array(CredentialClaimDisplay),
  path: z.string().array(),
});

export type CredentialSdJwtClaims = z.infer<typeof CredentialSdJwtClaims>;
export const CredentialSdJwtClaims = z.record(CredentialClaim);

const CredentialConfigurationClaims = z
  .array(CredentialClaim)
  .transform((claimsRaw) => {
    return claimsRaw
      .map((v) => ({
        path: v.path,
        details: {
          mandatory: v.mandatory,
          display: v.display,
        },
      }))
      .reduce(
        (cumulated, entry) => pathInsert(cumulated, entry.path, entry.details),
        {}
      );
  });

export type CredentialConfigurationSupported = z.infer<
  typeof CredentialConfigurationSupported
>;
export const CredentialConfigurationSupported = z.record(
  z.object({
    cryptographic_suites_supported: z.array(z.string()).optional(),
    vct: z.string().optional(),
    scope: z.string().optional(),
    cryptographic_binding_methods_supported: z.array(z.string()),
    display: z.array(CredentialDisplay),
    format: CredentialFormat,
    claims: CredentialConfigurationClaims,
  })
);

export type CredentialIssuerKeys = z.infer<typeof CredentialIssuerKeys>;
export const CredentialIssuerKeys = z.object({
  keys: z.array(JWK),
});

export type CredentialResponseEncryption = z.infer<
  typeof CredentialResponseEncryption
>;
export const CredentialResponseEncryption = z.object({
  alg_values_supported: z.string().array(),
  enc_values_supported: z.string().array(),
  encryption_required: z.boolean(),
});

export type CredentialIssuerConfiguration = z.infer<
  typeof CredentialIssuerConfiguration
>;
export const CredentialIssuerConfiguration = z.object({
  credential_configurations_supported: CredentialConfigurationSupported,
  credential_issuer: z.string(),
  credential_endpoint: z.string(),
  nonce_endpoint: z.string().optional(),
  batch_credential_issuance: z.object({
    batch_size: z.number(),
  }),
  credential_response_encryption: CredentialResponseEncryption,
});

export type CredentialIssuerOauthAuthorizationServer = z.infer<
  typeof CredentialIssuerOauthAuthorizationServer
>;
export const CredentialIssuerOauthAuthorizationServer = z.object({
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
});

export type CredentialIssuerOpenidCondiguration = z.infer<
  typeof CredentialIssuerOauthAuthorizationServer
>;
export const CredentialIssuerOpenidCondiguration = z.object({
  jwks_uri: z.string(),
});
