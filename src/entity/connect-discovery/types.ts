import { JWK } from "src/utils/jwk";
import * as z from "zod";

// Display metadata for a credential, used by the issuer to
// instruct the Wallet Solution on how to render the credential correctly
export type OpenConnectCredentialDisplay = z.infer<
  typeof OpenConnectCredentialDisplay
>;
export const OpenConnectCredentialDisplay = z.object({
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

const OpenConnectCredentialFormat = z.union([
  z.literal("vc+sd-jwt"),
  z.literal("mso_mdoc"),
]);

const OpenConnectProofType = z.object({
  proof_alg_values_supported: z.array(z.number()).optional(),
  proof_crv_values_supported: z.array(z.number()).optional(),
  proof_signing_alg_values_supported: z.array(z.string()),
});

const OpenConnectCredentialProofTypes = z.object({
  jwt: OpenConnectProofType,
  cwt: OpenConnectProofType,
  ldp_vp: OpenConnectProofType,
});

type OpenConnectCredentialSdJwtClaims = z.infer<
  typeof OpenConnectCredentialSdJwtClaims
>;
const OpenConnectCredentialSdJwtClaims = z.record(
  z.object({
    mandatory: z.boolean(),
    display: z.array(z.object({ name: z.string(), locale: z.string() })),
  })
);

const OpenConnectCredentialSdJwt = z.object({
  claims: OpenConnectCredentialSdJwtClaims,
  credential_signing_alg_values_supported: z.array(z.string()),
  cryptographic_binding_methods_supported: z.array(z.string()),
  display: OpenConnectCredentialDisplay,
  format: OpenConnectCredentialFormat,
  proof_types_supported: OpenConnectCredentialProofTypes.optional(),
  scope: z.string(),
  vct: z.string(),
});

const OpenConnectCredentialMdoc = z.object({
  claims: z.string(),
  credential_alg_values_supported: z.array(z.number()),
  credential_crv_values_supported: z.array(z.number()),
  credential_signing_alg_values_supported: z.array(z.string()),
  cryptographic_binding_methods_supported: z.array(z.string()),
  display: z.array(OpenConnectCredentialDisplay),
  doctype: z.string(),
  format: OpenConnectCredentialFormat,
  policy: z.object({
    batch_size: z.number(),
    one_time_use: z.boolean(),
  }),
  proof_types_supported: OpenConnectCredentialProofTypes.optional(),
  scope: z.string(),
});

export type OpenConnectCredentialConfigurationsSupported = z.infer<
  typeof OpenConnectCredentialConfigurationsSupported
>;
export const OpenConnectCredentialConfigurationsSupported = z.record(
  z.union([OpenConnectCredentialSdJwt, OpenConnectCredentialMdoc])
);

export type OpenConnectCredentialIssuer = z.infer<
  typeof OpenConnectCredentialIssuer
>;
export const OpenConnectCredentialIssuer = z.object({
  credential_issuer: z.string(),
  authorization_services: z.array(z.string()).optional(),
  credential_endpoint: z.string(),
  batch_credential_endpoint: z.string().optional(),
  deferred_credential_endpoint: z.string().optional(),
  notification_endpoint: z.string().optional(),
  credential_response_encryption: z
    .object({
      alg_values_supported: z.array(z.string()),
      enc_values_supported: z.array(z.string()),
      encyption_required: z.boolean(),
    })
    .optional(),
  credential_identifiers_supported: z.boolean().optional(),
  signed_metadata: z.string().optional(),
  display: z.array(OpenConnectCredentialDisplay),
  credential_configurations_supported:
    OpenConnectCredentialConfigurationsSupported,
});

export type OpenConnectCredentialIssuerConfiguration = z.infer<
  typeof OpenConnectCredentialIssuerConfiguration
>;
export const OpenConnectCredentialIssuerConfiguration = z.object({
  authorization_endpoint: z.string(),
  backchannel_logout_session_required: z.boolean(),
  backchannel_logout_supported: z.boolean(),
  claims_parameter_supported: z.boolean(),
  code_challenge_methods_supported: z.array(z.string()),
  credential_endpoint: z.string(),
  end_session_endpoint: z.string(),
  frontchannel_logout_session_required: z.boolean(),
  frontchannel_logout_supported: z.boolean(),
  grant_types_supported: z.array(z.string()),
  id_token_signing_alg_values_supported: z.array(z.string()),
  introspection_endpoint: z.string(),
  issuer: z.string(),
  jwks_uri: z.string().url(),
  pushed_authorization_request_endpoint: z.string(),
  registration_endpoint: z.string(),
  request_object_signing_alg_values_supported: z.array(z.string()),
  request_parameter_supported: z.boolean(),
  request_uri_parameter_supported: z.boolean(),
  require_request_uri_registration: z.boolean(),
  response_modes_supported: z.array(z.string()),
  response_types_supported: z.array(z.string()),
  scopes_supported: z.array(z.string()),
  subject_types_supported: z.array(z.string()),
  token_endpoint: z.string(),
  token_endpoint_auth_methods_supported: z.string(z.string()),
  userinfo_endpoint: z.string(),
  userinfo_signing_alg_values_supported: z.array(z.string()),
  version: z.string(),
});

export type OpenConnectCredentialIssuerKeys = z.infer<
  typeof OpenConnectCredentialIssuerKeys
>;
export const OpenConnectCredentialIssuerKeys = z.object({
  keys: z.array(JWK),
});
