import { z } from "zod";

/**
 * Credential Offer Schema (IT Wallet)
 *
 * This schema models the Credential Offer as defined by the IT Wallet specification:
 * https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/credential-issuance-endpoint.html
 *
 * The Credential Offer is delivered by the Credential Issuer to the Wallet via a URI query parameter `credential_offer`.
 * It contains the following mandatory fields:
 *
 * - credential_issuer: HTTPS URL uniquely identifying the Credential Issuer. Used by the Wallet to obtain issuer metadata.
 * - credential_configuration_ids: Array of strings, each specifying a unique identifier of the Credential described in the credential_configurations_supported map in the issuer metadata.
 * - grants: Object describing supported OAuth 2.0 grant types. MUST contain an authorization_code object with parameters:
 *   - authorization_server: HTTPS URL of the Authorization Server.
 *   - issuer_state: Optional string, present only in issuer-initiated flows. MUST match the value in the Credential Offer.
 *
 * See OpenID4VCI Section 4.1.1 and IT Wallet documentation for details.
 */

/**
 * Authorization Code Grant schema
 * Parameters for OAuth 2.0 Authorization Code flow.
 *
 * Fields:
 * - issuer_state (optional): Present only in issuer-initiated flow. MUST match Credential Offer value.
 * - authorization_server: HTTPS URL of the Authorization Server.
 */
export const AuthorizationCodeGrantSchema = z.object({
  issuer_state: z.string(),
  authorization_server: z.string().url(),
});

export type AuthorizationCodeGrant = z.infer<
  typeof AuthorizationCodeGrantSchema
>;

/**
 * Grants schema
 * Supported OAuth 2.0 grant types for Credential Offer.
 *
 * Fields:
 * - authorization_code: Parameters for Authorization Code Grant (see above).
 */
export const GrantsSchema = z.object({
  authorization_code: AuthorizationCodeGrantSchema.optional(),
});

export type Grants = z.infer<typeof GrantsSchema>;

/**
 * Credential Offer schema
 * Core object for initiating credential issuance (OpenID4VCI, IT Wallet).
 *
 * Fields:
 * - credential_issuer: HTTPS URL uniquely identifying the Credential Issuer.
 * - credential_configuration_ids: Array of unique credential configuration IDs.
 * - grants: Supported OAuth 2.0 grant types and parameters.
 */
export const CredentialOfferSchema = z.object({
  credential_issuer: z.string().url(),
  credential_configuration_ids: z.array(z.string()),
  grants: GrantsSchema,
});

export type CredentialOffer = z.infer<typeof CredentialOfferSchema>;
