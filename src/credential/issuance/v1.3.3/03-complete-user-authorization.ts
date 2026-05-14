import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationResult,
} from "../../../utils/auth";
import parseUrl from "parse-url";
import type { DcqlQuery } from "dcql";
import {
  createAuthorizationResponse as sdkCreateAuthorizationResponse,
  parseAuthorizeRequest,
} from "@pagopa/io-wallet-oid4vp";
import { sendAuthorizationResponseAndExtractCode } from "@pagopa/io-wallet-oid4vci";
import type { jsonWebKeySet } from "@pagopa/io-wallet-oid-federation";
import { parseMrtdChallenge } from "@pagopa/io-wallet-oauth2";
import { AuthorizationError, AuthorizationIdpError } from "../common/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import { RemotePresentation as RemotePresentationFlow } from "../../presentation/v1.3.3";
import {
  createVerifyJwtFromJwks,
  partialCallbacks,
} from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import { IoWalletError, IssuerResponseError } from "../../../utils/errors";
import type { IssuanceApi, IssuerConfig } from "../api";
import { mapToRequestObject } from "./mappers";
import type { RemotePresentation, RequestObject } from "../../presentation";
import { hasStatusOrThrow } from "../../../utils/misc";

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

    const requestObjectJwt = await appFetch(
      `${authzRequestEndpoint}?${params.toString()}`,
      { method: "GET" }
    )
      .then(hasStatusOrThrow(200, IssuerResponseError))
      .then((res) => res.text());

    const parsedAuthRequest = await parseAuthorizeRequest({
      config: sdkConfigV1_3,
      requestObjectJwt,
      callbacks: {
        verifyJwt: createVerifyJwtFromJwks(issuerConf.keys),
      },
    });

    return mapToRequestObject(parsedAuthRequest);
  };

export const completeUserAuthorizationWithFormPostJwtMode: IssuanceApi["completeUserAuthorizationWithFormPostJwtMode"] =
  async (requestObject, issuerConfig, pid, { pidKeyTag, appFetch = fetch }) => {
    Logger.log(
      LogLevel.DEBUG,
      `The requeste credential is not a PersonIdentificationData, completing the user authorization with form_post.jwt mode`
    );

    const dcqlQueryResult = await RemotePresentationFlow.evaluateDcqlQuery(
      requestObject.dcql_query as DcqlQuery,
      [[pidKeyTag, pid]]
    );

    // Strip any prefix from the client_id so it's not included in the vp_token
    const clientId = requestObject.client_id.replace(
      /^(openid_federation|x509_hash):/i,
      ""
    );

    const remotePresentation =
      await RemotePresentationFlow.prepareRemotePresentations(dcqlQueryResult, {
        clientId,
        nonce: requestObject.nonce,
        responseUri: requestObject.response_uri,
      });

    const authzResponse = await createAuthorizationResponse({
      requestObject,
      issuerConfig,
      remotePresentation,
    });

    Logger.log(LogLevel.DEBUG, `Authz response: ${authzResponse}`);

    const issuerSigKey = issuerConfig.keys.find((key) => key.use === "sig");
    if (!issuerSigKey) {
      const errorMessage = "No signature key found in Issuer Metadata JWKS";
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new IoWalletError(errorMessage);
    }

    return sendAuthorizationResponseAndExtractCode({
      authorizationResponseJarm: authzResponse.jarm.responseJwe,
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
 * @param remotePresentation The presentations to send, each with their VP token
 * @returns The Base64 encoded authorization response payload.
 */
const createAuthorizationResponse = ({
  issuerConfig,
  requestObject,
  remotePresentation,
}: {
  requestObject: RequestObject;
  issuerConfig: IssuerConfig;
  remotePresentation: RemotePresentation;
}) => {
  const vp_token = remotePresentation.presentations.reduce(
    (acc, { credentialId, vpToken }) => ({ ...acc, [credentialId]: [vpToken] }),
    {} as Record<string, string[]>
  );

  return sdkCreateAuthorizationResponse({
    requestObject,
    rpJwks: {
      jwks:
        requestObject.client_metadata?.jwks ??
        ({ keys: issuerConfig.keys } as jsonWebKeySet),
      encrypted_response_enc_values_supported:
        requestObject.client_metadata
          ?.encrypted_response_enc_values_supported ??
        issuerConfig.encrypted_response_enc_values_supported,
    },
    vp_token,
    callbacks: {
      encryptJwe: partialCallbacks.encryptJwe,
      generateRandom: partialCallbacks.generateRandom,
    },
  });
};
