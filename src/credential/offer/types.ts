import { z } from "zod";

/**
 * Transaction Code schema
 * Represents an optional one-time code that binds the pre-authorized_code
 * to a specific transaction. Used as an anti-replay mechanism.
 */
export const TxCodeSchema = z.object({
  length: z.number().int().positive().optional(),
  input_mode: z.enum(["numeric", "text"]).optional(),
  description: z.string().optional(),
});

export type TxCode = z.infer<typeof TxCodeSchema>;

/**
 * Pre-Authorized Code Grant schema
 * Used when the Issuer has already authenticated the End-User out of band,
 * and issues a short-lived code that the Wallet can exchange directly at the
 * token endpoint without going through the Authorization Endpoint.
 */
export const PreAuthorizedGrantSchema = z.object({
  "pre-authorized_code": z.string(),
  tx_code: TxCodeSchema.optional(),
});

export type PreAuthorizedGrant = z.infer<typeof PreAuthorizedGrantSchema>;

/**
 * Authorization Code Grant schema
 * Represents parameters for the standard OAuth 2.0 Authorization Code flow,
 * where the user interacts with the Authorization Server to obtain consent.
 */
export const AuthorizationCodeGrantSchema = z.object({
  issuer_state: z.string().optional(),
});

export type AuthorizationCodeGrant = z.infer<
  typeof AuthorizationCodeGrantSchema
>;

/**
 * Grants schema
 * Describes which OAuth 2.0 grant types the Credential Offer supports,
 * along with their respective parameters.
 */
export const GrantsSchema = z.object({
  "urn:ietf:params:oauth:grant-type:pre-authorized_code":
    PreAuthorizedGrantSchema.optional(),
  authorization_code: AuthorizationCodeGrantSchema.optional(),
});

export type Grants = z.infer<typeof GrantsSchema>;

/**
 * Credential Offer schema
 * Core object defined by OpenID4VCI for initiating a credential issuance.
 * Delivered by the Issuer to the Wallet either inline (credential_offer)
 * or by reference (credential_offer_uri).
 */
export const CredentialOfferSchema = z.object({
  credential_issuer: z.string().url(),
  credential_configuration_ids: z.array(z.string()),
  grants: GrantsSchema,
});

export type CredentialOffer = z.infer<typeof CredentialOfferSchema>;
