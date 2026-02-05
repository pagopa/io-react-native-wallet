import { z } from "zod";
import { stringToJSONSchema } from "../../../utils/zod";

/**
 * OAuth 2.0 Authorization Code flow parameters.
 */
export const AuthorizationCodeGrantSchema = z.object({
  issuer_state: z.string().optional(),
  authorization_server: z.string().url().optional(),
  scope: z.string(),
});

export type AuthorizationCodeGrant = z.infer<
  typeof AuthorizationCodeGrantSchema
> & {
  type: "authorization_code";
};

/**
 * Transaction Code requirements for Pre-Authorized Code flow.
 */
export const TransactionCodeSchema = z.object({
  input_mode: z.enum(["numeric", "text"]).optional(),
  length: z.number().int().positive().optional(),
  description: z.string().max(300).optional(),
});

export type TransactionCode = z.infer<typeof TransactionCodeSchema>;

/**
 * Pre-Authorized Code flow parameters.
 */
export const PreAuthorizedCodeGrantSchema = z.object({
  "pre-authorized_code": z.string(),
  tx_code: TransactionCodeSchema.optional(),
});

export type PreAuthorizedCodeGrant = z.infer<
  typeof PreAuthorizedCodeGrantSchema
> & {
  type: "pre-authorized_code";
};

/**
 * Supported grant types for Credential Offer.
 */
export const GrantsSchema = z.object({
  authorization_code: AuthorizationCodeGrantSchema.optional(),
  "urn:ietf:params:oauth:grant-type:pre-authorized_code":
    PreAuthorizedCodeGrantSchema.optional(),
});

export type Grants = z.infer<typeof GrantsSchema>;

/**
 * Credential Offer object as defined in OpenID4VCI Section 4.1.1.
 */
export const CredentialOfferSchema = z.object({
  credential_issuer: z.string().url(),
  credential_configuration_ids: z.array(z.string()).min(1),
  grants: GrantsSchema,
});

export type CredentialOffer = z.infer<typeof CredentialOfferSchema>;

export const CredentialOfferParams = z.union([
  z.object({
    credential_offer: stringToJSONSchema.pipe(CredentialOfferSchema),
    credential_offer_uri: z.undefined(),
  }),
  z.object({
    credential_offer: z.undefined(),
    credential_offer_uri: z.string().url(),
  }),
]);

// TODO: evaluate if using this schema or moving it inside a common folder

export const ASMetadataSchema = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  pushed_authorization_request_endpoint: z.string().url().optional(),
  jwks_uri: z.string().url(),
});

export type ASMetadata = z.infer<typeof ASMetadataSchema>;

const ClaimDisplaySchema = z.object({
  locale: z.string(),
  name: z.string(),
});

const ClaimSchema = z.object({
  display: z.array(ClaimDisplaySchema),
  mandatory: z.boolean().optional(),
  path: z.array(z.string()),
  value_type: z.string().optional(),
});

const LogoSchema = z.object({
  alt_text: z.string(),
  uri: z.string(),
});

const CredentialDisplaySchema = z.object({
  locale: z.string(),
  logo: LogoSchema.optional(),
  name: z.string(),
});

const CredentialMetadataSchema = z.object({
  claims: z.array(ClaimSchema).optional(),
  display: z.array(CredentialDisplaySchema).optional(),
});

const JwtProofSchema = z.object({
  proof_signing_alg_values_supported: z.array(z.string()),
});

const CwtProofSchema = z.object({
  proof_alg_values_supported: z.array(z.number()),
  proof_crv_values_supported: z.array(z.number()),
  proof_signing_alg_values_supported: z.array(z.string()),
});

const ProofTypesSupportedSchema = z.object({
  jwt: JwtProofSchema.optional(),
  cwt: CwtProofSchema.optional(),
});

const PolicySchema = z.object({
  batch_size: z.number().optional(),
  one_time_use: z.boolean().optional(),
});

const CredentialConfigurationSchema = z.object({
  format: z.string(),
  scope: z.string().optional(),
  cryptographic_binding_methods_supported: z.array(z.string()).optional(),
  credential_signing_alg_values_supported: z
    .array(z.union([z.string(), z.number()]))
    .optional(),
  proof_types_supported: ProofTypesSupportedSchema.optional(),
  credential_metadata: CredentialMetadataSchema.optional(),
  doctype: z.string().optional(),
  credential_alg_values_supported: z.array(z.number()).optional(),
  credential_crv_values_supported: z.array(z.number()).optional(),
  policy: PolicySchema.optional(),
  vct: z.string().optional(),
});

const BatchCredentialIssuanceSchema = z.object({
  batch_size: z.number().optional(),
});

const CredentialEncryptionSchema = z.object({
  enc_values_supported: z.array(z.string()),
  encryption_required: z.boolean(),
  jwks: z.object({
    keys: z.array(z.any()),
  }),
});

const CredentialResponseEncryptionSchema = z.object({
  alg_values_supported: z.array(z.string()),
  enc_values_supported: z.array(z.string()),
  encryption_required: z.boolean(),
});

export const CredentialIssuerMetadataSchema = z.object({
  credential_issuer: z.string().url(),
  credential_endpoint: z.string().url(),
  nonce_endpoint: z.string().url(),

  credential_configurations_supported: z.record(
    z.string(),
    CredentialConfigurationSchema
  ),

  authorization_servers: z.array(z.string().url()).optional(),
  batch_credential_issuance: BatchCredentialIssuanceSchema.optional(),
  credential_request_encryption: CredentialEncryptionSchema.optional(),
  credential_response_encryption: CredentialResponseEncryptionSchema.optional(),
  deferred_credential_endpoint: z.string().url().optional(),
  display: z.array(CredentialDisplaySchema).optional(),
  notification_endpoint: z.string().url().optional(),
});

export type CredentialIssuerMetadata = z.infer<
  typeof CredentialIssuerMetadataSchema
>;
