import { z } from "zod";

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

export const ASMetadataSchema = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  pushed_authorization_request_endpoint: z.string().url().optional(),
  jwks_uri: z.string().url(),
});

export type ASMetadata = z.infer<typeof ASMetadataSchema>;
