import {
  AuthorizationErrorShape,
  AuthorizationResultShape,
  type AuthorizationResult,
} from "../../../utils/auth";
import parseUrl from "parse-url";
import {
  createAuthorizationResponse,
  parseAuthorizeRequest,
  fetchAuthorizationResponse,
  type CreateAuthorizationResponseResult,
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
import { sdkConfigV1_3, sdkConfigV1_4 } from "../../../utils/config";
import { IoWalletError, IssuerResponseError } from "../../../utils/errors";
import type {
  EvaluatedDcqlQueryResult,
  IssuanceApi,
  IssuerConfig,
} from "../api";
import { mapToRequestObject } from "./mappers";
import type { RequestObject } from "../../presentation";
import { hasStatusOrThrow } from "../../../utils/misc";

export const continueUserAuthorizationWithMRTDPoPChallenge: IssuanceApi["continueUserAuthorizationWithMRTDPoPChallenge"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      "The requested credential is a PID and requires MRTD PoP, starting MRTD PoP validation from auth redirect"
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

export const completePidUserAuthorizationWithQueryMode: IssuanceApi["completePidUserAuthorizationWithQueryMode"] =
  async (authRedirectUrl) => {
    Logger.log(
      LogLevel.DEBUG,
      "The requested credential is a PID, completing the user authorization with query mode"
    );
    const query = parseUrl(authRedirectUrl).query;

    return parseAuthorizationResponse(query);
  };

export const getRequestedCredentialToBePresented: IssuanceApi["getRequestedCredentialToBePresented"] =
  async (issuerRequestUri, clientId, issuerConf, appFetch = fetch) => {
    Logger.log(
      LogLevel.DEBUG,
      "The requested credential is not a PID, requesting the credential to be presented"
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

// NOTE: this function is not used in the 1.3 issuance flow. It may be removed in the future.
export const completeUserAuthorizationWithFormPostJwtMode: IssuanceApi["completeUserAuthorizationWithFormPostJwtMode"] =
  async (
    requestObject,
    issuerConfig,
    evaluatedDcqlQuery,
    { appFetch = fetch }
  ) => {
    Logger.log(
      LogLevel.DEBUG,
      "The requested credential is not a PID, completing the user authorization with form_post.jwt mode"
    );

    const authzResponse = await processPidPresentationAndCreateAuthzResponse({
      requestObject,
      issuerConfig,
      evaluatedDcqlQuery,
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
      state: requestObject.state ?? "",
      presentationResponseUri: requestObject.response_uri,
      signer: {
        alg: "ES256",
        method: "jwk",
        publicJwk: issuerSigKey,
      },
    });
  };

export const completeEaaUserAuthorizationWithQueryMode: IssuanceApi["completeEaaUserAuthorizationWithQueryMode"] =
  async (
    requestObject,
    issuerConfig,
    evaluatedDcqlQuery,
    clientRedirectUri,
    { appFetch = fetch, fetchFinalRedirectUri } = {}
  ) => {
    Logger.log(
      LogLevel.DEBUG,
      "The requested credential is not a PID, completing the user authorization with query mode"
    );

    const authzResponse = await processPidPresentationAndCreateAuthzResponse({
      requestObject,
      issuerConfig,
      evaluatedDcqlQuery,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Authz response: ${JSON.stringify(authzResponse)}`
    );

    const { redirect_uri } = await fetchAuthorizationResponse({
      authorizationResponseJarm: authzResponse.jarm.responseJwe,
      presentationResponseUri: requestObject.response_uri,
      callbacks: {
        ...partialCallbacks,
        fetch: appFetch,
      },
    });

    if (!redirect_uri) {
      const errorMessage =
        "The authorization server did not return a redirect_uri to continue the authorization flow";
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new AuthorizationError(errorMessage);
    }

    let finalRedirectUri: string | undefined;

    if (fetchFinalRedirectUri) {
      finalRedirectUri = await fetchFinalRedirectUri(redirect_uri);
    } else {
      const response = await appFetch(redirect_uri).catch(() => null);
      if (!response || !response.ok) {
        const errorMessage = `An error occurred while completing the authorization flow. Ensure ${clientRedirectUri} is a valid HTTP url for redirect`;
        Logger.log(LogLevel.ERROR, errorMessage);
        throw new AuthorizationError(errorMessage);
      }
      finalRedirectUri = response.url;
    }

    if (!finalRedirectUri || !finalRedirectUri.startsWith(clientRedirectUri)) {
      const errorMessage = `The authorization server did not redirect to the provided client redirect URI. Expected: ${clientRedirectUri}, got: ${finalRedirectUri}`;
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new AuthorizationError(errorMessage);
    }

    return parseAuthorizationResponse(parseUrl(finalRedirectUri).query);
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
 * Utility function to process the DCQL query for PID presentation and to create the authorization response to send to the Issuer.
 * @param params.requestObject - The request object containing the DCQL query
 * @param params.issuerConfig - The Issuer unified configuration
 * @param params.evaluatedDcqlQuery - Credentials that satisfy the request object's DCQL query
 * @returns The authorization response containing the JARM to be sent to the Issuer
 */
const processPidPresentationAndCreateAuthzResponse = async ({
  requestObject,
  issuerConfig,
  evaluatedDcqlQuery,
}: {
  requestObject: RequestObject;
  issuerConfig: IssuerConfig;
  evaluatedDcqlQuery: EvaluatedDcqlQueryResult;
}): Promise<CreateAuthorizationResponseResult> => {
  const remotePresentation =
    await RemotePresentationFlow.prepareRemotePresentations(
      evaluatedDcqlQuery,
      {
        clientId: requestObject.client_id,
        nonce: requestObject.nonce,
        responseUri: requestObject.response_uri,
      }
    );

  const vp_token = remotePresentation.presentations.reduce(
    (acc, { credentialId, vpToken }) => ({ ...acc, [credentialId]: [vpToken] }),
    {} as Record<string, string[]>
  );

  return createAuthorizationResponse({
    // The SDK 1.4 config is used here in order to resolve the encryption data from the Request Object
    // client_metadata, otherwise OpenID Federation clients always ignore client_metadata as per 1.3.3 specs.
    config: sdkConfigV1_4,
    requestObject,
    rpJwks: {
      jwks: { keys: issuerConfig.keys } as jsonWebKeySet,
      encrypted_response_enc_values_supported:
        issuerConfig.encrypted_response_enc_values_supported,
    },
    vp_token,
    callbacks: {
      encryptJwe: partialCallbacks.encryptJwe,
      generateRandom: partialCallbacks.generateRandom,
    },
  });
};
