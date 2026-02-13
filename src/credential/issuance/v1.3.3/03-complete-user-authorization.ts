import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationResult,
} from "../../../utils/auth";
import parseUrl from "parse-url";
import type { DcqlQuery } from "dcql";
import { fetchAuthorizationRequest } from "@pagopa/io-wallet-oid4vp";
import { sendAuthorizationResponseAndExtractCode } from "@pagopa/io-wallet-oid4vci";
import { parseMrtdChallenge } from "@pagopa/io-wallet-oauth2";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { AuthorizationError, AuthorizationIdpError } from "../common/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import { RemotePresentation } from "../../presentation/v1.0.0"; // TODO: import from presentation v1.3.3
import { type RemotePresentationDetails } from "../../presentation/api/types";
import { partialCallbacks } from "../../../utils/callbacks";
import type { IssuanceApi } from "../api";
import { mapToRequestObject } from "./mappers";

export const continueUserAuthorizationWithMRTDPoPChallenge: IssuanceApi["continueUserAuthorizationWithMRTDPoPChallenge"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requested credential is a PersonIdentificationData and requires MRTD PoP, starting MRTD PoP validation from auth redirect`
    );
    try {
      const parsedChallenge = parseMrtdChallenge({
        redirectUrl: authRedirectUrl,
      });
      return { challenge_info: parsedChallenge.challengeJwt };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "MRTD challenge parsing failed";
      Logger.log(
        LogLevel.ERROR,
        `Error while parsing the authorization response: ${errorMessage}`
      );
      throw new AuthorizationError(errorMessage);
    }
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

export const completeUserAuthorizationWithQueryMode: IssuanceApi["completeUserAuthorizationWithQueryMode"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requested credential is a PersonIdentificationData, completing the user authorization with query mode`
    );
    const query = parseUrl(authRedirectUrl).query;

    return parseAuthorizationResponse(query);
  };

export const getRequestedCredentialToBePresented: IssuanceApi["getRequestedCredentialToBePresented"] =
  async (issuerRequestUri, clientId, issuerConf, appFetch = fetch) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, requesting the credential to be presented`
    );

    const authzRequestEndpoint = issuerConf.authorization_endpoint;
    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Requesting the request object to ${authzRequestEndpoint}?${params.toString()}`
    );

    // TODO: catch and throw IssuerResponseError
    const authResponse = await fetchAuthorizationRequest({
      authorizeRequestUrl: `${authzRequestEndpoint}?${params.toString()}`,
      callbacks: {
        ...partialCallbacks,
        fetch: appFetch,
      },
    });

    return mapToRequestObject(authResponse.parsedAuthorizeRequest);
  };

export const completeUserAuthorizationWithFormPostJwtMode: IssuanceApi["completeUserAuthorizationWithFormPostJwtMode"] =
  async (
    requestObject,
    issuerConfig,
    pid,
    { wiaCryptoContext, pidCryptoContext, appFetch = fetch }
  ) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, completing the user authorization with form_post.jwt mode`
    );

    if (!requestObject.dcql_query) {
      throw new Error("Invalid request object");
    }

    // TODO: update after RemotePresentation integrates IO Wallet SDK
    const dcqlQueryResult = RemotePresentation.evaluateDcqlQuery(
      [[pidCryptoContext, pid]],
      requestObject.dcql_query as DcqlQuery
    );

    const credentialsToPresent = dcqlQueryResult.map(
      ({ requiredDisclosures, ...rest }) => ({
        ...rest,
        requestedClaims: requiredDisclosures.map(([, claimName]) => claimName),
      })
    );

    const remotePresentations =
      await RemotePresentation.prepareRemotePresentations(
        credentialsToPresent,
        requestObject
      );

    const authzResponsePayload = await createAuthzResponsePayload({
      state: requestObject.state,
      remotePresentations,
      wiaCryptoContext,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Authz response payload: ${authzResponsePayload}`
    );

    const issuerSigKey = issuerConfig.keys.find((key) => key.use === "sig");
    if (!issuerSigKey) {
      const errorMessage = "No signature key found in Issuer Metadata JWKS";
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new Error(errorMessage);
    }

    return sendAuthorizationResponseAndExtractCode({
      authorizationResponseJarm: authzResponsePayload,
      callbacks: {
        ...partialCallbacks,
        fetch: appFetch,
      },
      iss: requestObject.iss,
      state: requestObject.state!,
      presentationResponseUri: requestObject.response_uri,
      signer: {
        alg: "ES256",
        method: "jwk",
        publicJwk: issuerSigKey,
      },
    });
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
        LogLevel.ERROR,
        `Error while parsing the authorization response: ${authResParsed.error.message}`
      );
      throw new AuthorizationError(authResParsed.error.message); // an error occured while parsing the result and the error
    }
    Logger.log(
      LogLevel.ERROR,
      `Error while authorizating with the idp: ${JSON.stringify(authErr)}`
    );
    throw new AuthorizationIdpError(
      authErr.data.error,
      authErr.data.error_description
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
  state,
  remotePresentations,
  wiaCryptoContext,
}: {
  state?: string;
  remotePresentations: RemotePresentationDetails[];
  wiaCryptoContext: CryptoContext;
}): Promise<string> => {
  const { kid } = await wiaCryptoContext.getPublicKey();

  return new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      typ: "jwt",
      kid,
    })
    .setPayload({
      /**
       * TODO [SIW-2264]: `state` coming from `requestObject` is marked as `optional`
       * At the moment, it is not entirely clear whether this value can indeed be omitted
       * and, if so, what the consequences of its absence might be.
       */
      ...(state ? { state } : {}),
      vp_token: remotePresentations.reduce(
        (vp_token, { credentialId, vpToken }) => ({
          ...vp_token,
          [credentialId]: vpToken,
        }),
        {}
      ),
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};
