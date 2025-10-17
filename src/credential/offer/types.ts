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
>;

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
  authorization_server: z.string().url().optional(),
});

export type PreAuthorizedCodeGrant = z.infer<
  typeof PreAuthorizedCodeGrantSchema
>;

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
