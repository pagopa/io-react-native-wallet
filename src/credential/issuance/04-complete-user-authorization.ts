import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationContext,
  type AuthorizationResult,
} from "../../../src/utils/auth";
import type { Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import parseUrl from "parse-url";
import { AuthorizationError, AuthorizationIdpError } from "../../utils/errors";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";

/**
 * The interface of the phase to complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
 */
export type CompleteUserAuthorizationWithQueryMode = (
  issuerRequestUri: Out<StartUserAuthorization>["issuerRequestUri"],
  clientId: Out<StartUserAuthorization>["clientId"],
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  authorizationContext: AuthorizationContext,
  idpHint: string,
  redirectUri: string
) => Promise<AuthorizationResult>;

/**
 * WARNING: This function must be called after {@link startUserAuthorization}. The next function to be called is {@link authorizeAccess}.
 * The interface of the phase to complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
 * It is used to complete the user authorization by catching the redirectSchema from the authorization server which then contains the authorization response.
 * This function utilizes the authorization context to open an in-app browser capable of catching the redirectSchema to perform a get request to the authorization endpoint.
 * If the 302 redirect happens and the redirectSchema is caught, the function will return the authorization response after parsing it from the query string.
 * @param issuerRequestUri the URI of the issuer where the request is sent
 * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param authorizationContext The context to identify the user which will be used to start the authorization. It's needed only when requesting a PersonalIdentificationData credential. The implementantion should open an in-app browser capable of catching the redirectSchema.
 * @param idphint Unique identifier of the SPID IDP selected by the user
 * @param redirectUri The url to reach to complete the user authorization which is the custom URL scheme that the Wallet Instance is registered to handle
 * @throws {AuthorizationError} if an error occurs during the authorization process
 * @throws {AuthorizationIdpError} if an error occurs during the authorization process and the error is related to the IDP
 * @returns the authorization response which contains code, state and iss
 */
export const completeUserAuthorizationWithQueryMode: CompleteUserAuthorizationWithQueryMode =
  async (
    issuerRequestUri,
    clientId,
    issuerConf,
    authorizationContext,
    idpHint,
    redirectUri
  ) => {
    /**
     * Starts the authorization flow which dependes on the response mode and the request credential.
     * If the response mode is "query" the authorization flow is handled differently via the authorization context which opens an in-app browser capable of catching the redirectSchema.
     * The form_post.jwt mode is not currently supported.
     */
    const authzRequestEndpoint =
      issuerConf.oauth_authorization_server.authorization_endpoint;

    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
      idphint: idpHint,
    });
    const redirectSchema = new URL(redirectUri).protocol.replace(":", "");

    /**
     * Starts the authorization flow to obtain an authorization code by performing a GET request to the /authorize endpoint of the authorization server.
     */
    const authRedirectUrl = await authorizationContext
      .authorize(`${authzRequestEndpoint}?${params}`, redirectSchema)
      .catch((e) => {
        throw new AuthorizationError(e.message);
      });

    const urlParse = parseUrl(authRedirectUrl);
    const authRes = AuthorizationResultShape.safeParse(urlParse.query);
    if (!authRes.success) {
      const authErr = AuthorizationErrorShape.safeParse(urlParse.query);
      if (!authErr.success) {
        throw new AuthorizationError(authRes.error.message); // an error occured while parsing the result and the error
      }
      throw new AuthorizationIdpError(
        authErr.data.error,
        authErr.data.error_description
      );
    }
    return authRes.data;
  };

// TODO: SIW-1120 implement generic credential issuance flow
export const compeUserAuthorizationWithFormPostJwtMode = () => {
  throw new Error("Not implemented");
};
