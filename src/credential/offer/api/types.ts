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

/**
 * Parameters for initiating the credential offer flow, which can be either a direct credential offer object or a URI pointing to the credential offer.
 */
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

/**
 * Credential Issuer Metadata as defined in OpenID4VCI Section 13.2.1
 */
export const CredentialIssuerMetadataSchema = z.object({
  credential_issuer: z.string().url(),
  credential_endpoint: z.string().url(),
  nonce_endpoint: z.string().url(),
  credential_configurations_supported: z.record(
    z.string(),
    z.object({
      format: z.string(),
      scope: z.string(),
      vct: z.string(),
      display: z
        .array(
          z.object({
            name: z.string(),
            locale: z.string(),
          })
        )
        .optional(),
    })
  ),
  notification_endpoint: z.string().url().optional(),
  authorization_servers: z.array(z.string().url()).optional(),
});

export type CredentialIssuerMetadata = z.infer<
  typeof CredentialIssuerMetadataSchema
>;

/**
 * Authorization Server Metadata as defined in OpenID4VCI Section 13.2.2
 */
export const ASMetadataSchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  pushed_authorization_request_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
  request_object_signing_alg_values_supported: z.array(z.string()).optional(),
  acr_values_supported: z.array(z.string()).optional(),
});

export type ASMetadata = z.infer<typeof ASMetadataSchema>;
