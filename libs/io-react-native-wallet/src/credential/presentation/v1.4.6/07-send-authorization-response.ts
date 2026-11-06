import { thumbprint } from "@pagopa/io-react-native-jwt";
import {
  extractEncryptionJwkFromJwks,
  createAuthorizationResponse as sdkCreateAuthorizationResponse,
  fetchAuthorizationResponse as sdkFetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";

import type { JWK } from "../../../utils/jwk";
import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import type { RequestObject } from "../api/types";

import { prepareVpTokenMdoc } from "../../../mdoc";
import { prepareVpToken } from "../../../sd-jwt";
import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_4 } from "../../../utils/config";
import { createCryptoContextFor } from "../../../utils/crypto";
import {
  IoWalletError,
  RelyingPartyResponseError,
} from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import { buildDirectPostBody } from "../common/utils/http";
import { mapSdkAuthorizationResponseError } from "./sdkErrorMapper";
import { AuthorizationResponse } from "./types";

// JWE alg used to encrypt the authorization response
const RESPONSE_ENCRYPTION_ALG = "ECDH-ES";

/**
 * Resolves the JWKS used to encrypt the authorization response.
 * The SDK gives priority to the Request Object's client_metadata, then falls back to the RP configuration
 * (when the RP is not an OpenID Federation client, rpConf is undefined).
 */
const getResponseEncryptionJwks = (
  requestObject: RequestObject,
  rpConf?: RelyingPartyConfig,
) => {
  const jwks = requestObject.client_metadata?.jwks ?? rpConf?.jwks;
  if (!jwks) {
    throw new IoWalletError(
      "Missing jwks in both rpConf and requestObject.client_metadata",
    );
  }
  return jwks;
};

/**
 * Computes the base64url SHA-256 thumbprint (RFC 7638) of the key the SDK will use to encrypt the
 * authorization response. It binds the ISO 18013-7 mdoc DeviceResponse to the encrypted response
 * through the OpenID4VP session transcript.
 */
const getResponseEncryptionJwkThumbprint = (
  requestObject: RequestObject,
  rpConf?: RelyingPartyConfig,
) => {
  const encryptionJwk = extractEncryptionJwkFromJwks(
    getResponseEncryptionJwks(requestObject, rpConf),
    { supportedAlgValues: [RESPONSE_ENCRYPTION_ALG] },
  );
  if (!encryptionJwk) {
    throw new IoWalletError("No encryption JWK found in metadata");
  }
  return thumbprint(encryptionJwk as JWK);
};

/**
 * Prepares remote presentations for a set of credentials.
 *
 * For each credential, this function:
 * - Validates the credential format (currently supports 'mso_mdoc' or 'dc+sd-jwt').
 * - Generates a verifiable presentation token (vpToken) using the appropriate method.
 * - For ISO 18013-7, binds the DeviceResponse to the thumbprint of the response encryption key.
 *
 * @param credentials - An array of credential items containing format, credential data, requested claims, and key information.
 * @param requestObject - The Request Object of the presentation.
 * @param rpConf - Optional Relying Party configuration (OpenID Federation clients only).
 * @returns A promise that resolves to an object containing an array of presentations.
 * @throws {CredentialNotFoundError} When the credential format is unsupported.
 */
export const prepareRemotePresentations: RemotePresentationApi["prepareRemotePresentations"] =
  async (credentials, requestObject, rpConf) => {
    const presentations = await Promise.all(
      credentials.map(async (item) => {
        const { format } = item;

        if (format === "dc+sd-jwt") {
          const { vp_token } = await prepareVpToken(
            requestObject.nonce,
            requestObject.client_id,
            [
              item.credential,
              item.presentationFrame,
              createCryptoContextFor(item.keyTag),
            ],
          );

          return {
            credentialId: item.id,
            format,
            requestedClaims: item.requiredDisclosures.map(({ name }) => name),
            vpToken: vp_token,
          };
        }

        if (format === "mso_mdoc") {
          const { vp_token } = await prepareVpTokenMdoc(
            requestObject.nonce,
            await getResponseEncryptionJwkThumbprint(requestObject, rpConf),
            requestObject.client_id,
            requestObject.response_uri,
            item.doctype,
            item.keyTag,
            [
              item.credential,
              item.presentationFrame,
              createCryptoContextFor(item.keyTag),
            ],
          );

          return {
            credentialId: item.id,
            format: "mso_mdoc",
            requestedClaims: item.requiredDisclosures.map(({ name }) => name),
            vpToken: vp_token,
          };
        }

        throw new IoWalletError(`${format} format is not supported.`);
      }),
    );

    return { presentations };
  };

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (
    requestObject,
    remotePresentation,
    rpConf,
    { appFetch = fetch } = {},
  ) => {
    try {
      const clientMetadata = requestObject.client_metadata;
      const rpJwks = {
        encrypted_response_enc_values_supported:
          rpConf?.encrypted_response_enc_values_supported ??
          clientMetadata?.encrypted_response_enc_values_supported,
        jwks: getResponseEncryptionJwks(requestObject, rpConf),
      };

      const vp_token = remotePresentation.presentations.reduce(
        (acc, p) => {
          (acc[p.credentialId] ??= []).push(p.vpToken);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const { jarm } = await sdkCreateAuthorizationResponse({
        // Must match the alg used to compute the mdoc jwkThumbprint in prepareRemotePresentations
        authorization_encrypted_response_alg: RESPONSE_ENCRYPTION_ALG,
        callbacks: {
          encryptJwe: partialCallbacks.encryptJwe,
          generateRandom: partialCallbacks.generateRandom,
        },
        config: sdkConfigV1_4,
        requestObject,
        rpJwks,
        vp_token,
      });

      return await sdkFetchAuthorizationResponse({
        authorizationResponseJarm: jarm.responseJwe,
        callbacks: { fetch: appFetch },
        presentationResponseUri: requestObject.response_uri,
      });
    } catch (err) {
      throw mapSdkAuthorizationResponseError(err);
    }
  };

export const sendAuthorizationErrorResponse: RemotePresentationApi["sendAuthorizationErrorResponse"] =
  async (
    requestObject,
    { error, errorDescription },
    { appFetch = fetch } = {},
  ) => {
    const requestBody = await buildDirectPostBody(requestObject, {
      error,
      error_description: errorDescription,
    });

    return await appFetch(requestObject.response_uri, {
      body: requestBody,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    })
      .then(hasStatusOrThrow(200, RelyingPartyResponseError))
      .then((res) => res.json())
      .then(AuthorizationResponse.parse);
  };
