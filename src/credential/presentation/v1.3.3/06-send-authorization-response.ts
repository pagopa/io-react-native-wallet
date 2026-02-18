import {
  createAuthorizationResponse as sdkCreateAuthorizationResponse,
  fetchAuthorizationResponse as sdkFetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";
import type { RemotePresentationApi } from "../api";
import { partialCallbacks } from "../../../../src/utils/callbacks";
import { mapSdkAuthorizationResponseError } from "./errors";
import { hasStatusOrThrow } from "../../../../src/utils/misc";
import { RelyingPartyResponseError } from "../../../../src/utils/errors";
import { AuthorizationResponse } from "./types";
import { buildDirectPostBody } from "../common/utils";

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (
    requestObject,
    remotePresentations,
    rpConf,
    { appFetch = fetch } = {}
  ) => {
    try {
      const rpJwks = {
        jwks: rpConf.jwks,
        encrypted_response_enc_values_supported:
          rpConf.encrypted_response_enc_values_supported,
      };

      const vp_token = remotePresentations.reduce(
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
