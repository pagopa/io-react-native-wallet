import { z } from "zod";

/**
 * OAuth 2.0 Authorization Code flow parameters.
 */
export const AuthorizationCodeGrantSchema = z.object({
  issuer_state: z.string().optional(),
  authorization_server: z.string().url().optional(),
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
  grants: GrantsSchema.optional(),
});

export type CredentialOffer = z.infer<typeof CredentialOfferSchema>;

/**
 * Token Response as defined in OpenID4VCI S.5.1.1 / S.5.1.2
 * Compatible with both authorization_code and pre-authorized_code grants.
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  c_nonce: z.string().optional(),
  c_nonce_expires_in: z.number().optional(),
  authorization_details: z.any().optional(),
  scope: z.string().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

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

export type ClaimDef = z.infer<typeof ClaimSchema>;

const LogoSchema = z.object({
  alt_text: z.string(),
  uri: z.string(),
});

const CredentialDisplaySchema = z.object({
  locale: z.string(),
  logo: LogoSchema.optional(),
  name: z.string(),
});

export type CredentialDisplay = z.infer<typeof CredentialDisplaySchema>;

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

export type CredentialConfiguration = z.infer<
  typeof CredentialConfigurationSchema
>;

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

// === Disclosure ============================================================

export const SdDisclosureSchema = z.object({
  salt: z.string(),
  key: z.string().optional(),
  value: z.unknown(),
  _digest: z.string().optional(),
  _encoded: z.string().optional(),
});

export type SdDisclosure = z.infer<typeof SdDisclosureSchema>;

// === JWT ===================================================================

export const SdJwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string(),
  kid: z.string().optional(),
  trust_chain: z.array(z.string()).optional(),
  x5c: z.array(z.string()).optional(),
  vctm: z.array(z.string()).optional(),
});

export const SdJwtPayloadSchema = z
  .object({
    iss: z.string(),
    iat: z.number().optional(),
    exp: z.number(),
    vct: z.string(),
    _sd_alg: z.literal("sha-256"),
    _sd: z.array(z.string()),
    cnf: z.object({
      jwk: z.record(z.unknown()),
    }),

    status: z
      .object({
        identifier_list: z.object({
          id: z.string(),
          uri: z.string(),
        }),
        status_list: z.object({
          idx: z.number(),
          uri: z.string(),
        }),
      })
      .optional(),

    issuing_authority: z.string().optional(),
    issuing_country: z.string().optional(),

    "vct#integrity": z.string().optional(),

    sub: z.string().optional(),
  })
  .passthrough();

export const SdJwtCoreSchema = z.object({
  header: SdJwtHeaderSchema,
  payload: SdJwtPayloadSchema,
  signature: z.string(),
  encoded: z.string(),
});

// === KB JWT ================================================================

export const SdKbJwtSchema = z.object({
  header: z.record(z.unknown()),
  payload: z.record(z.unknown()),
  signature: z.string(),
  encoded: z.string(),
});

// === SD-JWT DECODED ========================================================

export const SdJwtDecodedSchema = z.object({
  jwt: SdJwtCoreSchema,
  disclosures: z.array(SdDisclosureSchema),
  kbJwt: SdKbJwtSchema.optional(),
});

export type SdJwtDecoded = z.infer<typeof SdJwtDecodedSchema>;
