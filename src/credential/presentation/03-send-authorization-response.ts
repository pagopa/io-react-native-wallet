import { CredentialNotFoundError } from "./errors";
import { hasStatusOrThrow } from "../../utils/misc";
import {
  DirectAuthorizationBodyPayload,
  ErrorResponse,
  type RemotePresentation,
  type PrepareRemotePresentations,
  RequestObject,
} from "./types";
import * as z from "zod";

import { prepareVpTokenMdoc } from "../../mdoc";
import { generateRandomAlphaNumericString } from "../../utils/misc";
import { createCryptoContextFor } from "../../utils/crypto";
import { prepareVpToken } from "../../sd-jwt";

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string().optional(),
  response_code: z
    .string() /**
      FIXME: [SIW-627] we expect this value from every RP implementation
      Actually some RP does not return the value
      We make it optional to not break the flow.
    */
    .optional(),
  redirect_uri: z.string().optional(),
});

export const buildDirectPostBody = async (
  requestObject: RequestObject,
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  const formUrlEncodedBody = new URLSearchParams({
    ...(requestObject.state ? { state: requestObject.state } : {}),
    ...Object.fromEntries(
      Object.entries(payload).map(([key, value]) => {
        return [
          key,
          Array.isArray(value) || typeof value === "object"
            ? JSON.stringify(value)
            : value,
        ];
      })
    ),
  });

  return formUrlEncodedBody.toString();
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationResponse = (
  requestObject: RequestObject,
  remotePresentation: RemotePresentation,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationErrorResponse = (
  requestObject: RequestObject,
  error: ErrorResponse,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Sends the authorization error response to the Relying Party (RP) using the specified `response_mode`.
 * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
 *
 * @param requestObject - The request details, including presentation requirements.
 * @param error - The response error value
 * @param jwkKeys - Array of JWKs from the Relying Party for optional encryption.
 * @param context - Contains optional custom fetch implementation.
 * @returns Parsed and validated authorization response from the Relying Party.
 */
export const sendAuthorizationErrorResponse: SendAuthorizationErrorResponse =
  async (
    requestObject,
    error,
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
    // 2. Choose the appropriate request body builder based on response mode
    const requestBody = await buildDirectPostBody(requestObject, { error });
    // 3. Send the authorization error response via HTTP POST and validate the response
    return await appFetch(requestObject.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    })
      .then(hasStatusOrThrow(200))
      .then((res) => res.json())
      .then(AuthorizationResponse.parse);
  };

export const sendAuthorizationResponse: SendAuthorizationResponse = async (
  requestObject,
  remotePresentation,
  { appFetch = fetch } = {}
): Promise<AuthorizationResponse> => {
  const { presentations } = remotePresentation;
  // 1. Prepare the VP token as a JSON object with keys corresponding to the DCQL query credential IDs
  const requestBody = await buildDirectPostBody(requestObject, {
    vp_token: presentations.reduce(
      (acc, presentation) => ({
        ...acc,
        [presentation.credentialId]: presentation.vpToken,
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
    .then(AuthorizationResponse.parse);
};

/**
 * Prepares remote presentations for a set of credentials.
 *
 * For each credential, this function:
 * - Validates the credential format (currently supports 'mso_mdoc', 'vc+sd-jwt' or 'dc+sd-jwt').
 * - Generates a verifiable presentation token (vpToken) using the appropriate method.
 * - For ISO 18013-7, generates a special nonce with minimum entropy of 16.
 *
 * @param credentials - An array of credential items containing format, credential data, requested claims, and key information.
 * @param authRequestObject - The authentication request object containing nonce, clientId, and responseUri.
 * @returns A promise that resolves to an object containing an array of presentations and the generated nonce.
 * @throws {CredentialNotFoundError} When the credential format is unsupported.
 */
export const prepareRemotePresentations: PrepareRemotePresentations = async (
  credentials,
  authRequestObject
) => {
  /* In case of ISO 18013-7 we need a nonce, it shall have a minimum entropy of 16  */
  const generatedNonce = generateRandomAlphaNumericString(16);

  const presentations = await Promise.all(
    credentials.map(async (item) => {
      const { credentialInputId, format } = item;

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
            item.requestedClaims,
            createCryptoContextFor(item.keyTag),
          ]
        );

        return {
          requestedClaims: [...item.requestedClaims.map(({ name }) => name)],
          credentialId: credentialInputId,
          vpToken: vp_token,
          format: "mso_mdoc",
        };
      }

      if (format === "vc+sd-jwt" || format === "dc+sd-jwt") {
        const { vp_token } = await prepareVpToken(
          authRequestObject.nonce,
          authRequestObject.clientId,
          [
            item.credential,
            item.requestedClaims,
            createCryptoContextFor(item.keyTag),
          ]
        );

        return {
          requestedClaims: [...item.requestedClaims.map(({ name }) => name)],
          credentialId: credentialInputId,
          vpToken: vp_token,
          format,
        };
      }

      throw new CredentialNotFoundError(`${format} format is not supported.`);
    })
  );

  return {
    presentations,
    generatedNonce,
  };
};
