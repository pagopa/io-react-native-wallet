import {
  createAuthorizationResponse as sdkCreateAuthorizationResponse,
  fetchAuthorizationResponse as sdkFetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";
import type { RemotePresentationApi } from "../api";
import { partialCallbacks } from "../../../../src/utils/callbacks";
import { mapSdkAuthorizationResponseError } from "./sdkErrorMapper";
import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
} from "../../../../src/utils/misc";
import {
  IoWalletError,
  RelyingPartyResponseError,
} from "../../../../src/utils/errors";
import { AuthorizationResponse } from "./types";
import { buildDirectPostBody } from "../common/utils/http";
import { prepareVpToken } from "../../../sd-jwt";
import { createCryptoContextFor } from "../../../utils/crypto";
import { prepareVpTokenMdoc } from "src/mdoc";

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
            ]
          );

          return {
            requestedClaims: item.requiredDisclosures.map(({ name }) => name),
            credentialId: item.id,
            vpToken: vp_token,
            format,
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
            ]
          );

          return {
            requestedClaims: item.requiredDisclosures.map(({ name }) => name),
            credentialId: item.id,
            vpToken: vp_token,
            format: "mso_mdoc",
          };
        }

        throw new IoWalletError(`${format} format is not supported.`);
      })
    );

    return {
      presentations,
      generatedNonce,
    };
  };

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (
    requestObject,
    remotePresentation,
    rpConf,
    { appFetch = fetch } = {}
  ) => {
    try {
      const { presentations } = remotePresentation;
      const rpJwks = {
        jwks: rpConf.jwks,
        encrypted_response_enc_values_supported:
          rpConf.encrypted_response_enc_values_supported,
      };

      const vp_token = presentations.reduce(
        (acc, p) => {
          (acc[p.credentialId] ??= []).push(p.vpToken);
          return acc;
        },
        {} as Record<string, string[]>
      );

      const { jarm } = await sdkCreateAuthorizationResponse({
        requestObject,
        rpJwks,
        vp_token,
        callbacks: {
          encryptJwe: partialCallbacks.encryptJwe,
          generateRandom: partialCallbacks.generateRandom,
        },
      });

      return await sdkFetchAuthorizationResponse({
        authorizationResponseJarm: jarm.responseJwe,
        presentationResponseUri: requestObject.response_uri,
        callbacks: { fetch: appFetch },
      });
    } catch (err) {
      throw mapSdkAuthorizationResponseError(err);
    }
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
