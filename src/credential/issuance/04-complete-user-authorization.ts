import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationResult,
} from "../../utils/auth";
import { type Out } from "../../utils/misc";
import parseUrl from "parse-url";
import type { GetIssuerConfig } from "./02-get-issuer-config";
import { AuthorizationError, AuthorizationIdpError } from "./errors";

/**
 * The interface of the phase to complete User authorization via strong identification when the response mode is "query" and the request credential is a urn:eu.europa.ec.eudi:pid:1.
 */
export type CompleteUserAuthorizationWithQueryMode = (
  authRedirectUrl: string
) => Promise<AuthorizationResult>;

export type BuildAuthorizationUrl = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  request_uri: string,
  client_id: string,
  state: string
) => Promise<{
  authUrl: string;
}>;

/**
 * WARNING: This function must be called after {@link startUserAuthorization}. The generated authUrl must be used to open a browser or webview capable of catching the redirectSchema to perform a get request to the authorization endpoint.
 * Builds the authorization URL to which the end user should be redirected to continue the authentication flow.
 * @param issuerRequestUri the URI of the issuer where the request is sent
 * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
 * @param issuerConf The issuer configuration returned by {@link getIssuerConfig}
 * @param idpHint Unique identifier of the IDP selected by the user
 * @returns An object containing the authorization URL
 */
export const buildAuthorizationUrl: BuildAuthorizationUrl = async (
  issuerConf,
  request_uri,
  client_id,
  state
) => {
  const params = new URLSearchParams({
    client_id,
    state,
    request_uri,
  });

  const authUrl = `${issuerConf.authorization_endpoint}?${params}`;

  return { authUrl };
};

/**
 * WARNING: This function must be called after obtaining the authorization redirect URL from the webviews (SPID and CIE L3) or browser for CIEID.
 * Complete User authorization via strong identification when the response mode is "query" and the request credential is a urn:eu.europa.ec.eudi:pid:1.
 * This function parses the authorization redirect URL to extract the authorization response.
 * @param authRedirectUrl The URL to which the end user should be redirected to start the authentication flow
 * @returns the authorization response which contains code, state and iss
 */
export const completeUserAuthorizationWithQueryMode: CompleteUserAuthorizationWithQueryMode =
  async (authRedirectUrl) => {
    const query = parseUrl(authRedirectUrl).query;

    return parseAuthorizationResponse(query);
  };

/**
 * Parse the authorization response and return the result which contains code, state and iss.
 * @throws {AuthorizationError} if an error occurs during the parsing process
 * @throws {AuthorizationIdpError} if an error occurs during the parsing process and the error is related to the IDP
 * @param authRes the authorization response to be parsed
 * @returns the authorization result which contains code, state and iss
 */
export const parseAuthorizationResponse = (
  authRes: unknown
): AuthorizationResult => {
  const authResParsed = AuthorizationResultShape.safeParse(authRes);
  if (!authResParsed.success) {
    const authErr = AuthorizationErrorShape.safeParse(authRes);
    if (!authErr.success) {
      throw new AuthorizationError(authResParsed.error.message); // an error occured while parsing the result and the error
    }
    throw new AuthorizationIdpError(
      authErr.data.error,
      authErr.data.error_description
    );
  }
  return authResParsed.data;
};
