import { jsonWebKeySchema } from "@pagopa/io-wallet-oid-federation";
import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { BaseEntityConfiguration } from "../common/types";

const RelyingPartyMetadata = z.object({
  application_type: z.string().optional(),
  authorization_encrypted_response_alg: z.string().optional(),
  authorization_encrypted_response_enc: z.string().optional(),
  authorization_signed_response_alg: z.string().optional(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  jwks: z.object({
    keys: z.array(jsonWebKeySchema),
  }),
  request_uris: z.array(z.string()).optional(),
});

// Display metadata for a credential, used by the issuer to
// instruct the Wallet Solution on how to render the credential correctly
type CredentialDisplayMetadata = z.infer<typeof CredentialDisplayMetadata>;
const CredentialDisplayMetadata = z.object({
  locale: z.string(),
  name: z.string(),
});

// Metadata for displaying issuer information
type CredentialIssuerDisplayMetadata = z.infer<
  typeof CredentialIssuerDisplayMetadata
>;
const CredentialIssuerDisplayMetadata = z.object({
  locale: z.string(),
  name: z.string(),
});

type ClaimsMetadata = z.infer<typeof ClaimsMetadata>;
const ClaimsMetadata = z.object({
  display: z.array(CredentialDisplayMetadata),
  path: z.array(z.union([z.string(), z.number(), z.null()])), // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-15.html#name-claims-path-pointer
});

type IssuanceErrorSupported = z.infer<typeof IssuanceErrorSupported>;
const IssuanceErrorSupported = z.object({
  display: z.array(
    z.object({
      description: z.string(),
      locale: z.string(),
      title: z.string(),
    }),
  ),
});

// Metadata for a credential which is supported by an Issuer
type SupportedCredentialMetadata = z.infer<typeof SupportedCredentialMetadata>;
const SupportedCredentialMetadata = z.intersection(
  z.discriminatedUnion("format", [
    z.object({ format: z.literal("dc+sd-jwt"), vct: z.string() }),
    z.object({ doctype: z.string(), format: z.literal("mso_mdoc") }),
  ]),
  z.object({
    authentic_source: z.string().optional(),
    claims: z.array(ClaimsMetadata),
    credential_signing_alg_values_supported: z.array(z.string()),
    cryptographic_binding_methods_supported: z.array(z.string()),
    display: z.array(CredentialDisplayMetadata),
    issuance_errors_supported: z
      .record(z.string(), IssuanceErrorSupported)
      .optional(),
    scope: z.string(),
  }),
);

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
        oauth_authorization_server: z.object({
          acr_values_supported: z.array(z.string()),
          authorization_endpoint: z.string(),
          client_registration_types_supported: z.array(z.string()),
          code_challenge_methods_supported: z.array(z.string()),
          grant_types_supported: z.array(z.string()),
          issuer: z.string(),
          jwks: z.object({ keys: z.array(JWK) }),
          pushed_authorization_request_endpoint: z.string(),
          request_object_signing_alg_values_supported: z.array(z.string()),
          response_modes_supported: z.array(z.string()),
          scopes_supported: z.array(z.string()),
          token_endpoint: z.string(),
          token_endpoint_auth_methods_supported: z.array(z.string()),
          token_endpoint_auth_signing_alg_values_supported: z.array(z.string()),
        }),
        openid_credential_issuer: z.object({
          credential_configurations_supported: z.record(
            z.string(),
            SupportedCredentialMetadata,
          ),
          credential_endpoint: z.string(),
          credential_issuer: z.string(),
          display: z.array(CredentialIssuerDisplayMetadata),
          evidence_supported: z.array(z.string()),
          jwks: z.object({ keys: z.array(JWK) }),
          nonce_endpoint: z.string(),
          revocation_endpoint: z.string().optional(),
          status_attestation_endpoint: z.string(),
          trust_frameworks_supported: z.array(z.string()),
        }),
        /**
         * Credential Issuers act as Relying Party when they require the presentation of other credentials.
         * This does not apply for PID issuance, which requires CIE authz.
         */
        openid_credential_verifier: RelyingPartyMetadata.optional(),
      }),
    }),
  }),
);

// Entity configuration for a Relying Party
export type RelyingPartyEntityConfiguration = z.infer<
  typeof RelyingPartyEntityConfiguration
>;
export const RelyingPartyEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      metadata: z.object({
        openid_credential_verifier: RelyingPartyMetadata,
      }),
    }),
  }),
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
            aal_values_supported: z.array(z.string()).optional(),
            grant_types_supported: z.array(z.string()),
            jwks: z.object({ keys: z.array(JWK) }),
            token_endpoint: z.string(),
            token_endpoint_auth_methods_supported: z.array(z.string()),
            token_endpoint_auth_signing_alg_values_supported: z.array(
              z.string(),
            ),
          })
          .loose(),
      }),
    }),
  }),
);

// Maps any entity configuration by the union of every possible shapes
export type EntityConfiguration = z.infer<typeof EntityConfiguration>;
export const EntityConfiguration = z
  .union([
    WalletProviderEntityConfiguration,
    CredentialIssuerEntityConfiguration,
    TrustAnchorEntityConfiguration,
    RelyingPartyEntityConfiguration,
  ])
  .describe("Any kind of Entity Configuration allowed in the ecosystem");
