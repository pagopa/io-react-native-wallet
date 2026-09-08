import {
  type CryptoContext,
  decode,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import parseUrl from "parse-url";

import type { RemotePresentation } from "../../presentation";
import type { IssuanceApi } from "../api";

import {
  AuthorizationChallengeResultShape,
  AuthorizationErrorShape,
  type AuthorizationResult,
  AuthorizationResultShape,
} from "../../../utils/auth";
import { getJwtFromFormPost } from "../../../utils/decoder";
import {
  IssuerResponseError,
  UnimplementedFeatureError,
  ValidationFailed,
} from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { hasStatusOrThrow } from "../../../utils/misc";
import { RemotePresentation as RemotePresentationFlow } from "../../presentation/v1.0.0";
import { RawRequestObject } from "../../presentation/v1.0.0/types";
import { AuthorizationError, AuthorizationIdpError } from "../common/errors";
import { ResponseUriResultShape } from "./types";

export const continueUserAuthorizationWithMRTDPoPChallenge: IssuanceApi["continueUserAuthorizationWithMRTDPoPChallenge"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requested credential is a PersonIdentificationData and requires MRTD PoP, starting MRTD PoP validation from auth redirect`,
    );
    const query = parseUrl(authRedirectUrl).query;

    const authResParsed = AuthorizationChallengeResultShape.safeParse(query);
    if (!authResParsed.success) {
      const authErr = AuthorizationErrorShape.safeParse(query);
      if (!authErr.success) {
        Logger.log(
          LogLevel.ERROR,
          `Error while parsing the authorization response: ${authResParsed.error.message}`,
        );
        throw new AuthorizationError(authResParsed.error.message); // an error occured while parsing the result and the error
      }
      Logger.log(
        LogLevel.ERROR,
        `Error while authorizating with the idp: ${JSON.stringify(authErr)}`,
      );
      throw new AuthorizationIdpError(
        authErr.data.error,
        authErr.data.error_description,
      );
    }
    return authResParsed.data;
  };

export const buildAuthorizationUrl: IssuanceApi["buildAuthorizationUrl"] =
  async (issuerRequestUri, clientId, issuerConf, idpHint) => {
    const authzRequestEndpoint = issuerConf.authorization_endpoint;

    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
    });

    if (idpHint) {
      params.append("idphint", idpHint);
    }

    const authUrl = `${authzRequestEndpoint}?${params}`;

    return { authUrl };
  };

export const completePidUserAuthorizationWithQueryMode: IssuanceApi["completePidUserAuthorizationWithQueryMode"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requested credential is a PersonIdentificationData, completing the user authorization with query mode`,
    );
    const query = parseUrl(authRedirectUrl).query;

    return parseAuthorizationResponse(query);
  };

export const completeEaaUserAuthorizationWithQueryMode: IssuanceApi["completeEaaUserAuthorizationWithQueryMode"] =
  () => {
    throw new UnimplementedFeatureError(
      "completeEaaUserAuthorizationWithQueryMode",
      "1.0.0",
    );
  };

export const getRequestedCredentialToBePresented: IssuanceApi["getRequestedCredentialToBePresented"] =
  async (issuerRequestUri, clientId, issuerConf, appFetch = fetch) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, requesting the credential to be presented`,
    );
    const authzRequestEndpoint = issuerConf.authorization_endpoint;
    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Requesting the request object to ${authzRequestEndpoint}?${params.toString()}`,
    );

    const requestObject = await appFetch(
      `${authzRequestEndpoint}?${params.toString()}`,
      { method: "GET" },
    )
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((res) => res.text())
      .then((jws) => decode(jws))
      .then((reqObj) =>
        RawRequestObject.safeParse({
          header: reqObj.protectedHeader,
          payload: reqObj.payload,
        }),
      );

    if (!requestObject.success) {
      Logger.log(
        LogLevel.ERROR,
        `Error while validating the response object: ${requestObject.error.message}`,
      );
      throw new ValidationFailed({
        message: "Request Object validation failed",
        reason: requestObject.error.message,
      });
    }
    return requestObject.data.payload;
  };

export const completeUserAuthorizationWithFormPostJwtMode: IssuanceApi["completeUserAuthorizationWithFormPostJwtMode"] =
  async (
    requestObject,
    _issuerConfig,
    evaluatedDcqlQuery,
    { appFetch = fetch, wiaCryptoContext },
  ) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, completing the user authorization with form_post.jwt mode`,
    );

    const authRequestObject = {
      clientId: requestObject.client_id,
      nonce: requestObject.nonce,
      responseUri: requestObject.response_uri,
    };

    const remotePresentation =
      await RemotePresentationFlow.prepareRemotePresentations(
        evaluatedDcqlQuery,
        authRequestObject,
      );

    const authzResponsePayload = await createAuthzResponsePayload({
      remotePresentation,
      state: requestObject.state,
      wiaCryptoContext,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Authz response payload: ${authzResponsePayload}`,
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
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    })
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((reqUri) => reqUri.json());

    const responseUri = ResponseUriResultShape.safeParse(resUriRes);
    if (!responseUri.success) {
      Logger.log(
        LogLevel.ERROR,
        `Error while validating the response uri: ${responseUri.error.message}`,
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
  authRes: unknown,
): AuthorizationResult => {
  const authResParsed = AuthorizationResultShape.safeParse(authRes);
  if (!authResParsed.success) {
    const authErr = AuthorizationErrorShape.safeParse(authRes);
    if (!authErr.success) {
      Logger.log(
        LogLevel.ERROR,
        `Error while parsing the authorization response: ${authResParsed.error.message}`,
      );
      throw new AuthorizationError(authResParsed.error.message); // an error occured while parsing the result and the error
    }
    Logger.log(
      LogLevel.ERROR,
      `Error while authorizating with the idp: ${JSON.stringify(authErr)}`,
    );
    throw new AuthorizationIdpError(
      authErr.data.error,
      authErr.data.error_description,
    );
  }
  return authResParsed.data;
};

/**
 * Creates the authorization response payload to be sent.
 * This payload includes the state and the VP tokens for the presented credentials.
 * The payload is encoded in Base64.
 * @param state - The state parameter from the request object (optional).
 * @param remotePresentations - An array of remote presentations containing credential IDs and their corresponding VP tokens.
 * @returns The Base64 encoded authorization response payload.
 */
const createAuthzResponsePayload = async ({
  remotePresentation,
  state,
  wiaCryptoContext,
}: {
  remotePresentation: RemotePresentation;
  state?: string;
  wiaCryptoContext: CryptoContext;
}): Promise<string> => {
  const { kid } = await wiaCryptoContext.getPublicKey();

  return new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      kid,
      typ: "jwt",
    })
    .setPayload({
      /**
       * TODO [SIW-2264]: `state` coming from `requestObject` is marked as `optional`
       * At the moment, it is not entirely clear whether this value can indeed be omitted
       * and, if so, what the consequences of its absence might be.
       */
      ...(state ? { state } : {}),
      vp_token: remotePresentation.presentations.reduce(
        (vp_token, { credentialId, vpToken }) => ({
          ...vp_token,
          [credentialId]: vpToken,
        }),
        {},
      ),
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};
