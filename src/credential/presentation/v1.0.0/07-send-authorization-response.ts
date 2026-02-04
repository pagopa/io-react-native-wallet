import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import { getJwksFromRpConfig } from "./04-retrieve-rp-jwks";
import { NoSuitableKeysFoundInEntityConfiguration } from "../common/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { JWK } from "../../../utils/jwk";
import {
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../../utils/errors";
import { prepareVpToken } from "../../../sd-jwt";
import type { RequestObject } from "../api/types";
import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import { AuthorizationResponse, DirectAuthorizationBodyPayload } from "./types";

/**
 * Selects a public key (with `use = enc`) from the set of JWK keys
 * offered by the Relying Party (RP) for encryption.
 *
 * @param rpJwkKeys - The array of JWKs retrieved from the RP entity configuration.
 * @returns The first suitable public key found in the list.
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If no suitable encryption key is found.
 */
export const choosePublicKeyToEncrypt = (rpJwkKeys: JWK[]): JWK => {
  const encKey = rpJwkKeys.find((jwk) => jwk.use === "enc");

  if (encKey) {
    return encKey;
  }

  // No suitable key found
  throw new NoSuitableKeysFoundInEntityConfiguration(
    "No suitable public key found for encryption."
  );
};

/**
 * Builds a URL-encoded form body for a direct POST response using JWT encryption.
 *
 * @param jwkKeys - Array of JWKs from the Relying Party for encryption.
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains the VP token to encrypt and the mapping of the credential disclosures
 * @returns A URL-encoded string for an `application/x-www-form-urlencoded` POST body, where `response` contains the encrypted JWE.
 */
export const buildDirectPostJwtBody = async (
  requestObject: RequestObject,
  rpConf: RelyingPartyConfig,
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  type Jwe = ConstructorParameters<typeof EncryptJwe>[1];

  // Prepare the authorization response payload to be encrypted
  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    ...payload,
  });
  // Choose a suitable public key for encryption
  const { keys } = getJwksFromRpConfig(rpConf);
  const encPublicJwk = choosePublicKeyToEncrypt(keys);

  // Encrypt the authorization payload
  const {
    authorization_encrypted_response_alg,
    authorization_encrypted_response_enc,
  } = rpConf;

  const defaultAlg: Jwe["alg"] =
    encPublicJwk.kty === "EC" ? "ECDH-ES" : "RSA-OAEP-256";

  const encryptedResponse = await new EncryptJwe(authzResponsePayload, {
    alg: (authorization_encrypted_response_alg as Jwe["alg"]) || defaultAlg,
    enc:
      (authorization_encrypted_response_enc as Jwe["enc"]) || "A256CBC-HS512",
    kid: encPublicJwk.kid,
  }).encrypt(encPublicJwk);

  // Build the x-www-form-urlencoded form body
  const formBody = new URLSearchParams({
    response: encryptedResponse,
    ...(requestObject.state ? { state: requestObject.state } : {}),
  });
  return formBody.toString();
};

/**
 * Builds a URL-encoded form body for a direct POST response without encryption.
 *
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains either the VP token to encrypt and the stringified mapping of the credential disclosures or the error code
 * @returns A URL-encoded string suitable for an `application/x-www-form-urlencoded` POST body.
 */
export const buildDirectPostBody = async (
  requestObject: RequestObject,
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  const formUrlEncodedBody = new URLSearchParams({
    ...(requestObject.state && { state: requestObject.state }),
    ...Object.entries(payload).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]:
          Array.isArray(value) || typeof value === "object"
            ? JSON.stringify(value)
            : value,
      }),
      {} as Record<string, string>
    ),
  });

  return formUrlEncodedBody.toString();
};

export const prepareRemotePresentations: RemotePresentationApi["prepareRemotePresentations"] =
  async (credentials, { nonce, client_id }) => {
    return Promise.all(
      credentials.map(async (item) => {
        const { vp_token } = await prepareVpToken(nonce, client_id, [
          item.credential,
          item.requestedClaims,
          item.cryptoContext,
        ]);

        return {
          credential_id: item.id,
          requested_claims: item.requestedClaims,
          vp_token: vp_token,
        };
      })
    );
  };

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (
    requestObject,
    remotePresentations,
    rpConf,
    { appFetch = fetch } = {}
  ) => {
    // 1. Prepare the VP token as a JSON object with keys corresponding to the DCQL query credential IDs
    const requestBody = await buildDirectPostJwtBody(requestObject, rpConf, {
      vp_token: remotePresentations.reduce(
        (acc, presentation) => ({
          ...acc,
          [presentation.credential_id]: presentation.vp_token,
        }),
        {} as Record<string, string>
      ),
    });

    // 2. Send the authorization response via HTTP POST and validate the response
    return await appFetch(requestObject.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    })
      .then(hasStatusOrThrow(200))
      .then((res) => res.json())
      .then(AuthorizationResponse.parse)
      .catch(handleAuthorizationResponseError);
  };

export const sendAuthorizationErrorResponse: RemotePresentationApi["sendAuthorizationErrorResponse"] =
  async (
    requestObject,
    { error, errorDescription },
    { appFetch = fetch } = {}
  ) => {
    const requestBody = await buildDirectPostBody(requestObject, {
      error,
      error_description: errorDescription,
    });

    return await appFetch(requestObject.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    })
      .then(hasStatusOrThrow(200, RelyingPartyResponseError))
      .then((res) => res.json())
      .then(AuthorizationResponse.parse);
  };

/**
 * Handle the the presentation error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {RelyingPartyResponseError} with a specific code for more context
 */
const handleAuthorizationResponseError = (e: unknown) => {
  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(RelyingPartyResponseError)
    .handle(400, {
      code: RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse,
      message:
        "The Authorization Response contains invalid parameters or it is malformed",
    })
    .handle(403, {
      code: RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse,
      message: "The Authorization Response was forbidden",
    })
    .handle("*", {
      code: RelyingPartyResponseErrorCodes.RelyingPartyGenericError,
      message: "Unable to successfully send the Authorization Response",
    })
    .buildFrom(e);
};
