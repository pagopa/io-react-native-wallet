import {
  createAuthorizationResponse as sdkCreateAuthorizationResponse,
  fetchAuthorizationResponse as sdkFetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";

import type { RemotePresentationApi } from "../api";

import { prepareVpTokenMdoc } from "../../../mdoc";
import { prepareVpToken } from "../../../sd-jwt";
import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_4 } from "../../../utils/config";
import { createCryptoContextFor } from "../../../utils/crypto";
import {
  IoWalletError,
  RelyingPartyResponseError,
} from "../../../utils/errors";
import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
} from "../../../utils/misc";
import { buildDirectPostBody } from "../common/utils/http";
import { mapSdkAuthorizationResponseError } from "./sdkErrorMapper";
import { AuthorizationResponse } from "./types";

/**
 * Prepares remote presentations for a set of credentials.
 *
 * For each credential, this function:
 * - Validates the credential format (currently supports 'mso_mdoc' or 'dc+sd-jwt').
 * - Generates a verifiable presentation token (vpToken) using the appropriate method.
 * - For ISO 18013-7, generates a special nonce with minimum entropy of 16.
 *
 * @param credentials - An array of credential items containing format, credential data, requested claims, and key information.
 * @param authRequestObject - The authentication request object containing nonce, clientId, and responseUri.
 * @returns A promise that resolves to an object containing an array of presentations and the generated nonce.
 * @throws {CredentialNotFoundError} When the credential format is unsupported.
 */
export const prepareRemotePresentations: RemotePresentationApi["prepareRemotePresentations"] =
  async (credentials, authRequestObject) => {
    // In case of ISO 18013-7 we need a nonce, it shall have a minimum entropy of 16
    const generatedNonce = generateRandomAlphaNumericString(16);

    const presentations = await Promise.all(
      credentials.map(async (item) => {
        const { format } = item;

        if (format === "dc+sd-jwt") {
          const { vp_token } = await prepareVpToken(
            authRequestObject.nonce,
            authRequestObject.clientId,
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
            authRequestObject.nonce,
            generatedNonce,
            authRequestObject.clientId,
            authRequestObject.responseUri,
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

    return {
      generatedNonce,
      presentations,
    };
  };

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (
    requestObject,
    remotePresentation,
    rpConf,
    { appFetch = fetch } = {},
  ) => {
    try {
      if (!rpConf && !requestObject.client_metadata) {
        throw new IoWalletError(
          "At least one of rpConf or requestObject.client_metadata must be provided to send the authorization response",
        );
      }

      // When the RP is not an OpenID Federation client, rpConf will be undefined
      // so the keys are taken from the Request Object's client_metadata.
      const clientMetadata = requestObject.client_metadata;
      const jwks = rpConf?.jwks ?? clientMetadata?.jwks;
      if (!jwks) {
        throw new IoWalletError(
          "Missing jwks in both rpConf and requestObject.client_metadata",
        );
      }
      const rpJwks = {
        encrypted_response_enc_values_supported:
          rpConf?.encrypted_response_enc_values_supported ??
          clientMetadata?.encrypted_response_enc_values_supported,
        jwks,
      };

      const vp_token = remotePresentation.presentations.reduce(
        (acc, p) => {
          (acc[p.credentialId] ??= []).push(p.vpToken);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const { jarm } = await sdkCreateAuthorizationResponse({
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
