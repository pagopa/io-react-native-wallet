import type {
  AuthorizationResponse,
  ErrorResponse,
  RemotePresentation,
  RequestObject,
} from "./types";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";
import type { EvaluateDcqlQueryApi } from "./06-evaluate-dcql-query";
import type { Out } from "../../../../src/utils/misc";
type FetchContext = { appFetch?: GlobalFetch["fetch"] };

export interface SendAuthorizationResponseApi {
  /**
   * Prepares remote presentations for a set of credentials.
   *
   * For each credential, this function:
   * - Validates the credential format (currently supports 'mso_mdoc' or 'dc+sd-jwt').
   * - Generates a verifiable presentation token (vpToken) using the appropriate method.
   * - For ISO 18013-7, generates a special nonce with minimum entropy of 16.
   *
   * @param credentials - An array of credential items containing format, credential data, requested claims, and key information.
   * @param authRequestObject - The authentication request object containing nonce, clientId, and responseUri.
   * @returns A promise that resolves to an object containing an array of presentations and the generated nonce.
   */
  prepareRemotePresentations(
    credentials: Out<EvaluateDcqlQueryApi["evaluateDcqlQuery"]>,
    authRequestObject: {
      nonce: string;
      clientId: string;
      responseUri: string;
    }
  ): Promise<RemotePresentation>;

  /**
   * Sends the authorization response containing the VP Token to the Relying Party (RP).
   * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
   * @since 1.0.0
   *
   * @param requestObject The request details, including presentation requirements.
   * @param remotePresentation The presentations to send, each with their VP token
   * @param rpConf The Relying Party common configuration
   * @param context Contains optional custom fetch implementation.
   * @returns Parsed and validated authorization response from the Relying Party.
   */
  sendAuthorizationResponse(
    requestObject: RequestObject,
    remotePresentation: RemotePresentation,
    rpConf: RelyingPartyConfig,
    context?: FetchContext
  ): Promise<AuthorizationResponse>;

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
    context?: FetchContext
  ): Promise<AuthorizationResponse>;
}
