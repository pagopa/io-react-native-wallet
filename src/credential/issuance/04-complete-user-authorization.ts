import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationResult,
} from "../../utils/auth";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import parseUrl from "parse-url";
import { IssuerResponseError, ValidationFailed } from "../../utils/errors";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import {
  decode,
  encodeBase64,
  SignJWT,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";
import { RequestObject } from "../presentation/types";
import { v4 as uuidv4 } from "uuid";
import { ResponseUriResultShape } from "./types";
import { getJwtFromFormPost } from "../../utils/decoder";
import { AuthorizationError, AuthorizationIdpError } from "./errors";
import { DebugLevel, Logger } from "../../utils/logging";

/**
 * The interface of the phase to complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
 */
export type CompleteUserAuthorizationWithQueryMode = (
  authRedirectUrl: string
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

export type BuildAuthorizationUrl = (
  issuerRequestUri: Out<StartUserAuthorization>["issuerRequestUri"],
  clientId: Out<StartUserAuthorization>["clientId"],
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  idpHint: string
) => Promise<{
  authUrl: string;
}>;

/**
 * WARNING: This function must be called after {@link startUserAuthorization}. The generated authUrl must be used to open a browser or webview capable of catching the redirectSchema to perform a get request to the authorization endpoint.
 * Builds the authorization URL to which the end user should be redirected to continue the authentication flow.
 * @param issuerRequestUri the URI of the issuer where the request is sent
 * @param clientId Identifies the current client across all the requests of the issuing flow returned by {@link startUserAuthorization}
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param idpHint Unique identifier of the IDP selected by the user
 * @returns An object containing the authorization URL
 */
export const buildAuthorizationUrl: BuildAuthorizationUrl = async (
  issuerRequestUri,
  clientId,
  issuerConf,
  idpHint
) => {
  const authzRequestEndpoint =
    issuerConf.oauth_authorization_server.authorization_endpoint;

  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: issuerRequestUri,
    idphint: idpHint,
  });

  const authUrl = `${authzRequestEndpoint}?${params}`;

  return { authUrl };
};

/**
 * WARNING: This function must be called after obtaining the authorization redirect URL from the webviews (SPID and CIE L3) or browser for CIEID.
 * Complete User authorization via strong identification when the response mode is "query" and the request credential is a PersonIdentificationData.
 * This function parses the authorization redirect URL to extract the authorization response.
 * @param authRedirectUrl The URL to which the end user should be redirected to start the authentication flow
 * @returns the authorization response which contains code, state and iss
 */
export const completeUserAuthorizationWithQueryMode: CompleteUserAuthorizationWithQueryMode =
  async (authRedirectUrl) => {
    Logger.log(
      DebugLevel.DEBUG,
      `The requeste credential is a PersonIdentificationData, completing the user authorization with query mode`
    );
    const query = parseUrl(authRedirectUrl).query;

    return parseAuthorizationResponse(query);
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
    Logger.log(
      DebugLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, requesting the credential to be presented`
    );
    const authzRequestEndpoint =
      issuerConf.oauth_authorization_server.authorization_endpoint;
    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
    });

    Logger.log(
      DebugLevel.DEBUG,
      `Requesting the request object to ${authzRequestEndpoint}?${params.toString()}`
    );

    const requestObject = await appFetch(
      `${authzRequestEndpoint}?${params.toString()}`,
      { method: "GET" }
    )
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((res) => res.text())
      .then((jws) => decode(jws))
      .then((reqObj) => RequestObject.safeParse(reqObj.payload));

    if (!requestObject.success) {
      Logger.log(
        DebugLevel.ERROR,
        `Error while validating the response object: ${requestObject.error.message}`
      );
      throw new ValidationFailed({
        message: "Request Object validation failed",
        reason: requestObject.error.message,
      });
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
    Logger.log(
      DebugLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, completing the user authorization with form_post.jwt mode`
    );

    const {
      wiaCryptoContext,
      pidCryptoContext,
      pid,
      walletInstanceAttestation,
      appFetch = fetch,
    } = ctx;

    const wiaWpToken = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        alg: "ES256",
        typ: "JWT",
      })
      .setPayload({
        vp: walletInstanceAttestation,
        jti: uuidv4().toString(),
        nonce: requestObject.nonce,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience(requestObject.response_uri)
      .sign();

    const pidWpToken = await new SignJWT(pidCryptoContext)
      .setProtectedHeader({
        alg: "ES256",
        typ: "JWT",
      })
      .setPayload({
        vp: pid,
        jti: uuidv4().toString(),
        nonce: requestObject.nonce,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience(requestObject.response_uri)
      .sign();

    Logger.log(
      DebugLevel.DEBUG,
      `Wallet instance attestation JWT token: ${wiaWpToken}`
    );

    /* The path parameter refers to the vp_token variable of the authzResponsePayload and must point to the plain credential which
     * is cointaned in the `vp` property of the signed jwt token payload
     */
    const presentationSubmission = {
      definition_id: `${uuidv4()}`,
      id: `${uuidv4()}`,
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

    Logger.log(
      DebugLevel.DEBUG,
      `Presentation submission: ${JSON.stringify(presentationSubmission)}`
    );

    const authzResponsePayload = encodeBase64(
      JSON.stringify({
        state: requestObject.state,
        presentation_submission: presentationSubmission,
        vp_token: [pidWpToken, wiaWpToken],
      })
    );

    Logger.log(
      DebugLevel.DEBUG,
      `Authz response payload: ${authzResponsePayload}`
    );

    // Note: according to the spec, the response should be encrypted with the public key of the RP however this is not implemented yet
    // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-response
    // const rsaPublicJwk = chooseRSAPublicKeyToEncrypt(rpConf);
    // const encrypted = await new EncryptJwe(authzResponsePayload, {
    //   alg: "RSA-OAEP-256",
    //   enc: "A256CBC-HS512",
    //   kid: rsaPublicJwk.kid,
    // }).encrypt(rsaPublicJwk);

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
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((reqUri) => reqUri.json());

    const responseUri = ResponseUriResultShape.safeParse(resUriRes);
    if (!responseUri.success) {
      Logger.log(
        DebugLevel.ERROR,
        `Error while validating the response uri: ${responseUri.error.message}`
      );
      throw new ValidationFailed({
        message: "Response Uri validation failed",
        reason: responseUri.error.message,
      });
    }

    return await appFetch(responseUri.data.redirect_uri)
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((res) => res.text())
      .then(getJwtFromFormPost)
      .then((cbRes) => parseAuthorizationResponse(cbRes.decodedJwt.payload));
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
      Logger.log(
        DebugLevel.ERROR,
        `Error while parsing the authorization response: ${authResParsed.error.message}`
      );
      throw new AuthorizationError(authResParsed.error.message); // an error occured while parsing the result and the error
    }
    Logger.log(
      DebugLevel.ERROR,
      `Error while authorizating with the idp: ${JSON.stringify(authErr)}`
    );
    throw new AuthorizationIdpError(
      authErr.data.error,
      authErr.data.error_description
    );
  }
  return authResParsed.data;
};
