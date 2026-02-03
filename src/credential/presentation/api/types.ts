import * as z from "zod";

export type PresentationParams = z.infer<typeof PresentationParams>;
export const PresentationParams = z.object({
  client_id: z.string().nonempty(),
  request_uri: z.string().url(),
  request_uri_method: z.enum(["get", "post"]),
  state: z.string().optional(),
});

export type WalletMetadata = z.infer<typeof WalletMetadata>;
export const WalletMetadata = z.object({
  presentation_definition_uri_supported: z.boolean().optional(),
  client_id_schemes_supported: z.array(z.string()).optional(),
  request_object_signing_alg_values_supported: z.array(z.string()).optional(),
  vp_formats_supported: z.record(
    z.string(),
    z.object({
      "sd-jwt_alg_values": z.array(z.string()).optional(), // alg_values_supported?
    })
  ),
});

/**
 * Wallet capabilities that must be submitted to get the Request Object
 * via POST request when the `request_uri_method` is `post`.
 */
export type RequestObjectWalletCapabilities = z.infer<
  typeof RequestObjectWalletCapabilities
>;
export const RequestObjectWalletCapabilities = z.object({
  wallet_metadata: WalletMetadata,
  wallet_nonce: z.string().optional(),
});

/**
 * This type models the possible error responses the OpenID4VP protocol allows for a presentation of a credential.
 * When the Wallet encounters one of these errors, it will notify the Relying Party through the `response_uri` endpoint.
 * See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/pid-eaa-presentation.html#authorization-response-errors for more information.
 */
export type ErrorResponse = z.infer<typeof ErrorResponse>;
export const ErrorResponse = z.enum([
  "invalid_request_object",
  "invalid_request_uri",
  "vp_formats_not_supported",
  "invalid_request",
  "access_denied",
  "invalid_client",
]);

export type AuthorizationResponse = {
  redirect_uri?: string;
};

/**
 * A object that associate the information needed to multiple remote presentation
 * Used with DCQL queries
 */
export type RemotePresentation = {
  requestedClaims: string[];
  credentialId: string;
  vpToken: string;
};

/**
 * Common Request Object type, decoupled from specific IT-Wallet versions
 */
export type RequestObject = {
  responseUri: string;
  nonce: string;
  state?: string;
  clientId: string;
  dcqlQuery: Record<string, unknown>;
};
