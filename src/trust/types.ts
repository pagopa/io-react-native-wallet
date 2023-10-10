import { UnixTime } from "../sd-jwt/types";
import { JWK } from "../utils/jwk";
import * as z from "zod";

export const TrustMark = z.object({ id: z.string(), trust_mark: z.string() });
export type TrustMark = z.infer<typeof TrustMark>;

// Display metadata for a credential, used by the issuer to
// instruct the Wallet Solution on how to render the credential correctly
type CredentialDisplayMetadata = z.infer<typeof CredentialDisplayMetadata>;
const CredentialDisplayMetadata = z.object({
  name: z.string(),
  locale: z.string(),
  logo: z.object({
    url: z.string(),
    alt_text: z.string(),
  }),
  background_color: z.string(),
  text_color: z.string(),
});

// Metadata for a credentia which i supported by a Issuer
type SupportedCredentialMetadata = z.infer<typeof SupportedCredentialMetadata>;
const SupportedCredentialMetadata = z.object({
  format: z.literal("vc+sd-jwt"),
  cryptographic_binding_methods_supported: z.array(z.string()),
  cryptographic_suites_supported: z.array(z.string()),
  display: z.array(CredentialDisplayMetadata),
});

export type EntityStatement = z.infer<typeof EntityStatement>;
export const EntityStatement = z.object({
  header: z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({ keys: z.array(JWK) }),
    trust_marks: z.array(TrustMark),
    iat: z.number(),
    exp: z.number(),
  }),
});

export type EntityConfigurationHeader = z.infer<
  typeof EntityConfigurationHeader
>;
export const EntityConfigurationHeader = z.object({
  typ: z.literal("entity-statement+jwt"),
  alg: z.string(),
  kid: z.string(),
});

// Structuire common to every Entity Configuration document
const BaseEntityConfiguration = z.object({
  header: EntityConfigurationHeader,
  payload: z
    .object({
      exp: UnixTime,
      iat: UnixTime,
      iss: z.string(),
      sub: z.string(),
      jwks: z.object({
        keys: z.array(JWK),
      }),
      metadata: z
        .object({
          federation_entity: z
            .object({
              federation_fetch_endpoint: z.string().optional(),
              federation_list_endpoint: z.string().optional(),
              federation_resolve_endpoint: z.string().optional(),
              federation_trust_mark_status_endpoint: z.string().optional(),
              federation_trust_mark_list_endpoint: z.string().optional(),
              homepage_uri: z.string().optional(),
              policy_uri: z.string().optional(),
              logo_uri: z.string().optional(),
              contacts: z.array(z.string()).optional(),
            })
            .passthrough(),
        })
        .passthrough(),
      authority_hints: z.array(z.string()).optional(),
    })
    .passthrough(),
});

// Entity configuration for a Trust Anchor (it has no specific metadata section)
export type TrustAnchorEntityConfiguration = z.infer<
  typeof TrustAnchorEntityConfiguration
>;
export const TrustAnchorEntityConfiguration = BaseEntityConfiguration;

// Entity configuration for a Credential Issuer
export type CredentialIssuerEntityConfiguration = z.infer<
  typeof CredentialIssuerEntityConfiguration
>;
export const CredentialIssuerEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      jwks: z.object({ keys: z.array(JWK) }),
      metadata: z.object({
        openid_credential_issuer: z.object({
          credential_issuer: z.string(),
          authorization_endpoint: z.string(),
          token_endpoint: z.string(),
          pushed_authorization_request_endpoint: z.string(),
          dpop_signing_alg_values_supported: z.array(z.string()),
          credential_endpoint: z.string(),
          credentials_supported: z.array(SupportedCredentialMetadata),
          jwks: z.object({ keys: z.array(JWK) }),
        }),
      }),
    }),
  })
);

// Entity configuration for a Wallet Provider
export type WalletProviderEntityConfiguration = z.infer<
  typeof WalletProviderEntityConfiguration
>;
export const WalletProviderEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      metadata: z.object({
        wallet_provider: z
          .object({
            token_endpoint: z.string(),
            attested_security_context_values_supported: z
              .array(z.string())
              .optional(),
            grant_types_supported: z.array(z.string()),
            token_endpoint_auth_methods_supported: z.array(z.string()),
            token_endpoint_auth_signing_alg_values_supported: z.array(
              z.string()
            ),
            jwks: z.object({ keys: z.array(JWK) }),
          })
          .passthrough(),
      }),
    }),
  })
);

// Entity configuration for a Relying Party
export type RelyingPartyEntityConfiguration = z.infer<
  typeof RelyingPartyEntityConfiguration
>;
export const RelyingPartyEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      metadata: z.object({
        wallet_relying_party: z
          .object({
            application_type: z.string().optional(),
            client_id: z.string().optional(),
            client_name: z.string().optional(),
            jwks: z.object({ keys: z.array(JWK) }),
            contacts: z.array(z.string()).optional(),
          })
          .passthrough(),
      }),
    }),
  })
);

// Maps any entity configuration by the union of every possible shapes
export type EntityConfiguration = z.infer<typeof EntityConfiguration>;
export const EntityConfiguration = z.union(
  [
    WalletProviderEntityConfiguration,
    CredentialIssuerEntityConfiguration,
    TrustAnchorEntityConfiguration,
    RelyingPartyEntityConfiguration,
  ],
  {
    description: "Any kind of Entity Configuration allowed in the ecosystem",
  }
);
