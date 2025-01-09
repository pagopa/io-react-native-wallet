import { UnixTime } from "../../sd-jwt/types";
import { JWK } from "../../utils/jwk";
import * as z from "zod";

// Display metadata for a credential, used by the issuer to
// instruct the Wallet Solution on how to render the credential correctly
export type CredentialDisplayMetadata = z.infer<
  typeof CredentialDisplayMetadata
>;
export const CredentialDisplayMetadata = z.object({
  name: z.string(),
  locale: z.string(),
  logo: z
    .object({
      url: z.string(),
      alt_text: z.string(),
    })
    .optional(), // TODO [SIW-1268]: should not be optional
  background_color: z.string().optional(), // TODO [SIW-1268]: should not be optional
  text_color: z.string().optional(), // TODO [SIW-1268]: should not be optional
});

type ClaimsMetadata = z.infer<typeof ClaimsMetadata>;
const ClaimsMetadata = z.record(
  z.object({
    mandatory: z.boolean(),
    display: z.array(z.object({ name: z.string(), locale: z.string() })),
  })
);

// Metadata for a credentia which is supported by a Issuer
export type SupportedCredentialMetadata = z.infer<
  typeof SupportedCredentialMetadata
>;
export const SupportedCredentialMetadata = z.array(
  z.object({
    cryptographic_suites_supported: z.array(z.string()),
    cryptographic_binding_methods_supported: z.array(z.string()),
    display: z.array(CredentialDisplayMetadata),
    format: z.union([z.literal("vc+sd-jwt"), z.literal("vc+mdoc-cbor")]),
    credential_definition: z.object({
      credentialSubject: ClaimsMetadata,
      type: z.array(z.string()),
    }),
    id: z.string(),
  })
);

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
      iss: z.string(),
      sub: z.string(),
      iat: UnixTime,
      exp: UnixTime,
      authority_hints: z.array(z.string()).optional(),
      jwks: z.object({
        keys: z.array(JWK),
      }),
    })
    .passthrough(),
});

// Entity configuration for a Credential Issuer
export type CredentialIssuerEntityConfiguration = z.infer<
  typeof CredentialIssuerEntityConfiguration
>;
export const CredentialIssuerEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      sub: z.string().url(),
      metadata: z.object({
        openid_credential_issuer: z.object({
          pushed_authorization_request_endpoint: z.string().url(),
          dpop_signing_alg_values_supported: z.array(z.string()),
          jwks: z.object({ keys: z.array(JWK) }),
          credential_issuer: z.string(),
          credential_configurations_supported: SupportedCredentialMetadata,
          authorization_endpoint: z.string(),
          token_endpoint: z.string(),
          credential_endpoint: z.string(),
        }),
      }),
      jwks: z.object({ keys: z.array(JWK) }),
      // iss: z.string().url(),
      // exp: UnixTime,
      // iat: UnixTime,
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
            aal_values_supported: z.array(z.string()).optional(),
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

// Maps any entity configuration by the union of every possible shapes
export type EntityConfiguration = z.infer<typeof EntityConfiguration>;
export const EntityConfiguration = z.union(
  [WalletProviderEntityConfiguration, CredentialIssuerEntityConfiguration],
  {
    description: "Any kind of Entity Configuration allowed in the ecosystem",
  }
);
