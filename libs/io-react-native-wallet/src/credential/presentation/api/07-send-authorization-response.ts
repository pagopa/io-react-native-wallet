import type { Out } from "../../../../src/utils/misc";
import type { EvaluateDcqlQueryApi } from "./06-evaluate-dcql-query";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";
import type {
  AuthorizationResponse,
  ErrorResponse,
  RemotePresentation,
  RequestObject,
} from "./types";
export interface SendAuthorizationResponseApi {
  /**
   * Prepares remote presentations for a set of credentials.
   *
   * For each credential, this function:
   * - Validates the credential format (currently supports 'mso_mdoc' or 'dc+sd-jwt').
   * - Generates a verifiable presentation token (vpToken) using the appropriate method.
   * - For mso_mdoc, binds the SessionTranscript to the thumbprint of the Relying Party key that will encrypt the response.
   *
   * @param credentials - An array of credential items containing format, credential data, requested claims, and key information.
   * @param authRequestObject - The authentication request object containing nonce, clientId, and responseUri. Its `client_metadata`, if any, takes precedence over `rpConf` to select the encryption key.
   * @param rpConf - The Relying Party keys used to encrypt the response. Required to present mso_mdoc credentials, unless `authRequestObject.client_metadata` has them.
   * @returns A promise that resolves to an object containing an array of presentations.
   */
  prepareRemotePresentations(
    credentials: Out<EvaluateDcqlQueryApi["evaluateDcqlQuery"]>,
    authRequestObject: {
      client_metadata?: Pick<
        NonNullable<RequestObject["client_metadata"]>,
        "jwks"
      >;
      clientId: string;
      nonce: string;
      responseUri: string;
    },
    rpConf?: Pick<RelyingPartyConfig, "jwks">,
  ): Promise<RemotePresentation>;

  /**
   * Sends the authorization error response to the Relying Party (RP).
   * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
   * @since 1.0.0
   *
   * @param requestObject The request details, including presentation requirements.
   * @param error The response error value, with description
   * @param context Contains optional custom fetch implementation.
   * @returns Parsed and validated authorization response from the Relying Party.
   */
  sendAuthorizationErrorResponse(
    requestObject: RequestObject,
    error: { error: ErrorResponse; errorDescription: string },
    context?: FetchContext,
  ): Promise<AuthorizationResponse>;

  /**
   * Sends the authorization response containing the VP Token to the Relying Party (RP).
   * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
   * @since 1.0.0
   *
   * @param requestObject The request details, including presentation requirements.
   * @param remotePresentation The presentations to send, each with their VP token
   * @param rpConf Optional Relying Party configuration (OpenID Federation clients only)
   * @param context Contains optional custom fetch implementation.
   * @returns Parsed and validated authorization response from the Relying Party.
   */
  sendAuthorizationResponse(
    requestObject: RequestObject,
    remotePresentation: RemotePresentation,
    rpConf?: RelyingPartyConfig,
    context?: FetchContext,
  ): Promise<AuthorizationResponse>;
}

interface FetchContext {
  appFetch?: typeof fetch;
}
