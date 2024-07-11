import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationContext,
  type AuthorizationResult,
} from "../../../src/utils/auth";
import { hasStatus, until, type Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import parseUrl from "parse-url";
import {
  AuthorizationError,
  AuthorizationIdpError,
  ValidationFailed,
} from "../../utils/errors";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { Linking } from "react-native";
import {
  decode,
  encodeBase64,
  EncryptJwe,
  SignJWT,
  verify,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";
import { RequestObject } from "../presentation/types";
import uuid from "react-native-uuid";
import { ResponseUriResultShape } from "./types";
import { getJwtFromFormPost } from "../../../src/utils/decoder";

/**
 * The interface of the phase to complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
 */
export type CompleteUserAuthorizationWithQueryMode = (
  issuerRequestUri: Out<StartUserAuthorization>["issuerRequestUri"],
  clientId: Out<StartUserAuthorization>["clientId"],
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  idpHint: string,
  redirectUri: string,
  authorizationContext?: AuthorizationContext
) => Promise<AuthorizationResult>;

export type CompleteUserAuthorizationWithFormPostJwtMode = (
  requestObject: Out<GetRequestedCredentialToBePresented>,
  context: {
    wiaCryptoContext: CryptoContext;
    pidCryptoContext: CryptoContext;
    pid: string;
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResult>;

export type GetRequestedCredentialToBePresented = (
  issuerRequestUri: Out<StartUserAuthorization>["issuerRequestUri"],
  clientId: Out<StartUserAuthorization>["clientId"],
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  appFetch?: GlobalFetch["fetch"]
) => Promise<RequestObject>;

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
 * If not specified, the default browser is used
 * @param idphint Unique identifier of the SPID IDP selected by the user
 * @param redirectUri The url to reach to complete the user authorization which is the custom URL scheme that the Wallet Instance is registered to handle, usually a custom URL or deeplink
 * @throws {AuthorizationError} if an error occurs during the authorization process
 * @throws {AuthorizationIdpError} if an error occurs during the authorization process and the error is related to the IDP
 * @returns the authorization response which contains code, state and iss
 */
export const completeUserAuthorizationWithQueryMode: CompleteUserAuthorizationWithQueryMode =
  async (
    issuerRequestUri,
    clientId,
    issuerConf,
    idpHint,
    redirectUri,
    authorizationContext
  ) => {
    const authzRequestEndpoint =
      issuerConf.oauth_authorization_server.authorization_endpoint;
    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
      idphint: idpHint,
    });
    const authUrl = `${authzRequestEndpoint}?${params}`;
    var authRedirectUrl: string | undefined;

    if (authorizationContext) {
      const redirectSchema = new URL(redirectUri).protocol.replace(":", "");
      authRedirectUrl = await authorizationContext
        .authorize(authUrl, redirectSchema)
        .catch((e) => {
          throw new AuthorizationError(e.message);
        });
    } else {
      // handler for redirectUri
      Linking.addEventListener("url", ({ url }) => {
        if (url.includes(redirectUri)) {
          authRedirectUrl = url;
        }
      });

      const openAuthUrlInBrowser = Linking.openURL(authUrl);

      /*
       * Waits for 120 seconds for the identificationRedirectUrl variable to be set
       * by the custom url handler. If the timeout is exceeded, throw an exception
       */
      const unitAuthRedirectIsNotUndefined = until(
        () => authRedirectUrl !== undefined,
        120
      );

      await Promise.all([openAuthUrlInBrowser, unitAuthRedirectIsNotUndefined]);

      if (authRedirectUrl === undefined) {
        throw new AuthorizationError("Invalid authentication redirect url");
      }
    }

    const query = parseUrl(authRedirectUrl).query;
    return parseAuthroizationResponse(query);
  };

/**
 * WARNING: This function must be called after {@link startUserAuthorization}. The next function to be called is {@link completeUserAuthorizationWithFormPostJwtMode}.
 * The interface of the phase to complete User authorization via presentation of existing credentials when the response mode is "form_post.jwt".
 * It is used as a first step to complete the user authorization by obtaining the requested credential to be presented from the authorization server.
 * The information is obtained by performing a GET request to the authorization endpoint with request_uri and client_id parameters.
 * @param issuerRequestUri the URI of the issuer where the request is sent
 * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {ValidationFailed} if an error while validating the response
 * @returns the request object which contains the credential to be presented in order to obtain the requested credential
 */
export const getRequestedCredentialToBePresented: GetRequestedCredentialToBePresented =
  async (issuerRequestUri, clientId, issuerConf, appFetch = fetch) => {
    const authzRequestEndpoint =
      issuerConf.oauth_authorization_server.authorization_endpoint;
    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
    });

    const requestObject = await appFetch(
      `${authzRequestEndpoint}?${params.toString()}`,
      { method: "GET" }
    )
      .then(hasStatus(200))
      .then((res) => res.text())
      .then((jws) => decode(jws))
      .then((reqObj) => RequestObject.safeParse(reqObj.payload));

    if (!requestObject.success) {
      throw new ValidationFailed(
        "Request Object validation failed",
        requestObject.error.message
      );
    }
    return requestObject.data;
  };

/**
 * WARNING: This function must be called after {@link startUserAuthorization}. The next function to be called is {@link completeUserAuthorizationWithFormPostJwtMode}.
 * The interface of the phase to complete User authorization via presentation of existing credentials when the response mode is "form_post.jwt".
 * It is used as a first step to complete the user authorization by obtaining the requested credential to be presented from the authorization server.
 * The information is obtained by performing a GET request to the authorization endpoint with request_uri and client_id parameters.
 * @param issuerRequestUri the URI of the issuer where the request is sent
 * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param context.walletInstanceAccestation the Wallet Instance's attestation to be presented
 * @param context.pid the PID to be presented
 * @param context.wiaCryptoContext The Wallet Instance's crypto context associated with the walletInstanceAttestation parameter
 * @param context.pidCryptoContext The PID crypto context associated with the pid parameter
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {ValidationFailed} if an error while validating the response
 * @returns the authorization response which contains code, state and iss
 */
export const completeUserAuthorizationWithFormPostJwtMode: CompleteUserAuthorizationWithFormPostJwtMode =
  async (requestObject, ctx) => {
    const {
      wiaCryptoContext,
      pidCryptoContext,
      pid,
      walletInstanceAttestation,
      appFetch = fetch,
    } = ctx;

    const wia_wp_token = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        alg: "ES256",
        typ: "JWT",
      })
      .setPayload({
        vp: walletInstanceAttestation,
        jti: uuid.v4().toString(),
        nonce: requestObject.nonce,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience(requestObject.response_uri)
      .sign();

    const pid_wp_token = await new SignJWT(pidCryptoContext)
      .setProtectedHeader({
        alg: "ES256",
        typ: "JWT",
      })
      .setPayload({
        vp: pid,
        jti: uuid.v4().toString(),
        nonce: requestObject.nonce,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience(requestObject.response_uri)
      .sign();

    const presentation_submission = {
      definition_id: `${uuid.v4()}`,
      id: `${uuid.v4()}`,
      descriptor_map: [
        {
          id: "PersonIdentificationData",
          path: "$.vp_token[0].vp",
          format: "vc+sd-jwt",
        },
        {
          id: "WalletAttestation",
          path: "$.vp_token[1].vp",
          format: "jwt",
        },
      ],
    };

    const authzResponsePayload = encodeBase64(
      JSON.stringify({
        state: requestObject.state,
        presentation_submission,
        vp_token: [pid_wp_token, wia_wp_token],
      })
    );

    const body = new URLSearchParams({
      response: authzResponsePayload,
    }).toString();
    const resUriRes = await appFetch(requestObject.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })
      .then(hasStatus(200))
      .then((reqUri) => reqUri.json());

    const responseUri = ResponseUriResultShape.safeParse(resUriRes);
    if (!responseUri.success) {
      throw new ValidationFailed(
        "Response Uri validation failed",
        responseUri.error.message
      );
    }

    return await appFetch(responseUri.data.redirect_uri)
      .then(hasStatus(200))
      .then((res) => res.text())
      .then(getJwtFromFormPost)
      .then((cbRes) => parseAuthroizationResponse(cbRes.decodedJwt.payload));
  };

const parseAuthroizationResponse = (authRes: unknown): AuthorizationResult => {
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
  console.log(authResParsed.data);
  return authResParsed.data;
};
