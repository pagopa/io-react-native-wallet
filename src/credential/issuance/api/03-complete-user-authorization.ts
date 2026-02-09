import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  AuthorizationChallengeResult,
  AuthorizationResult,
} from "../../../utils/auth";
import type { RequestObject } from "../../../credential/presentation/api";
import type { IssuerConfig } from "./IssuerConfig";

export interface CompleteUserAuthorizationApi {
  /**
   * WARNING: This function must be called after {@link startUserAuthorization}. The next function to be called is {@link completeUserAuthorizationWithFormPostJwtMode}.
   *
   * The interface of the phase to complete User authorization via presentation of existing credentials when the response mode is "form_post.jwt".
   * It is used as a first step to complete the user authorization by obtaining the requested credential to be presented from the authorization server.
   * The information is obtained by performing a GET request to the authorization endpoint with request_uri and client_id parameters.
   * @since 1.0.0
   *
   * @param issuerRequestUri the URI of the issuer where the request is sent
   * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
   * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
   * @param appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns the request object which contains the credential to be presented in order to obtain the requested credential
   * @throws {ValidationFailed} if an error while validating the response
   */
  getRequestedCredentialToBePresented(
    issuerRequestUri: string,
    clientId: string,
    issuerConf: IssuerConfig,
    appFetch?: GlobalFetch["fetch"]
  ): Promise<RequestObject>;

  /**
   * WARNING: This function must be called after obtaining the authorization redirect URL from the webviews (SPID and CIE L3) or browser for CIEID.
   *
   * Complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
   * This function parses the authorization redirect URL to extract the authorization response.
   * @since 1.0.0
   *
   * @param authRedirectUrl The URL to which the end user should be redirected to start the authentication flow
   * @returns the authorization response which contains code, state and iss
   */
  completeUserAuthorizationWithQueryMode(
    authRedirectUrl: string
  ): Promise<AuthorizationResult>;

  /**
   * WARNING: This function must be called after {@link getRequestedCredentialToBePresented}. The next function to be called is {@link authorizeAccess}.
   *
   * The interface of the phase to complete User authorization via presentation of existing credentials when the response mode is "form_post.jwt".
   * The information is obtained by performing a POST request to the endpoint received in the response_uri field of the requestObject, where the Authorization Response payload is posted.
   * Following this,the redirect_uri from the response is used to obtain the final authorization response.
   * @since 1.0.0
   *
   * @param requestObject - The request object containing the necessary parameters for authorization.
   * @param pid The `PID` that must be presented for the issuance of credentials.
   * @param appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns the authorization response which contains code, state and iss
   * @throws {ValidationFailed} if an error while validating the response
   */
  completeUserAuthorizationWithFormPostJwtMode(
    requestObject: RequestObject,
    pid: string,
    context: {
      wiaCryptoContext: CryptoContext;
      pidCryptoContext: CryptoContext;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<AuthorizationResult>;

  /**
   * WARNING: this function must be called after obtaining the authorization redirect URL from the webviews (SPID and CIE L3) or browser for CIEID, and the PID
   * issuance requires a MRTD PoP challenge.
   * @since 1.0.0
   *
   * @param authRedirectUrl The URL to which the end user should be redirected to start the MRTD PoP validation flow
   * @returns the authorization response which contains the challenge
   */
  continueUserAuthorizationWithMRTDPoPChallenge(
    authRedirectUrl: string
  ): Promise<AuthorizationChallengeResult>;

  /**
   * WARNING: This function must be called after {@link startUserAuthorization}.
   *
   * The generated authUrl must be used to open a browser or webview capable of catching the redirectSchema to perform a get request to the authorization endpoint.
   * Builds the authorization URL to which the end user should be redirected to continue the authentication flow.
   * @since 1.0.0
   *
   * @param issuerRequestUri the URI of the issuer where the request is sent
   * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
   * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
   * @param idpHint Unique identifier of the IDP selected by the user (optional)
   * @returns An object containing the authorization URL
   */
  buildAuthorizationUrl(
    issuerRequestUri: string,
    clientId: string,
    issuerConf: IssuerConfig,
    idpHint?: string
  ): Promise<{ authUrl: string }>;
}
