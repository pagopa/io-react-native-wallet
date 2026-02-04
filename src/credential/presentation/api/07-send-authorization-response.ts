import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  AuthorizationResponse,
  ErrorResponse,
  RemotePresentationDetails,
  RequestObject,
} from "./types";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";

type FetchContext = { appFetch?: GlobalFetch["fetch"] };

export interface SendAuthorizationResponseApi {
  /**
   * Prepares remote presentations for a set of credentials.
   *
   * For each credential generates a verifiable presentation token (vpToken) using the appropriate method.
   *
   * @param credentials An array of credential items containing format, credential data, requested claims, and key information.
   * @param requestObject The request details, including presentation requirements.
   * @returns A promise that resolves to an object containing an array of presentations and the generated nonce.
   */
  prepareRemotePresentations(
    credentials: {
      id: string;
      credential: string;
      cryptoContext: CryptoContext;
      requestedClaims: string[];
    }[],
    requestObject: RequestObject
  ): Promise<RemotePresentationDetails[]>;

  /**
   * Sends the authorization response containing the VP Token to the Relying Party (RP).
   * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
   * @since 1.0.0
   *
   * @param requestObject The request details, including presentation requirements.
   * @param remotePresentations The presentations to send, each with their VP token
   * @param rpConf The Relying Party common configuration
   * @param context Contains optional custom fetch implementation.
   * @returns Parsed and validated authorization response from the Relying Party.
   */
  sendAuthorizationResponse(
    requestObject: RequestObject,
    remotePresentations: RemotePresentationDetails[],
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
