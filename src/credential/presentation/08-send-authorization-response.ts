import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import type { FetchJwks } from "./04-retrieve-rp-jwks";
import type { VerifyRequestObjectSignature } from "./05-verify-request-object";
import {
  NoSuitableKeysFoundInEntityConfiguration,
  CredentialNotFoundError,
} from "./errors";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import {
  DirectAuthorizationBodyPayload,
  ErrorResponse,
  type RemotePresentation,
  type PrepareRemotePresentations,
} from "./types";
import * as z from "zod";
import type { JWK } from "../../utils/jwk";
import { Base64 } from "js-base64";

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

/**
 * Selects a public key (with `use = enc`) from the set of JWK keys
 * offered by the Relying Party (RP) for encryption.
 *
 * Preference is given to EC keys (P-256 or P-384), followed by RSA keys,
 * based on compatibility and common usage for encryption.
 *
 * @param rpJwkKeys - The array of JWKs retrieved from the RP entity configuration.
 * @returns The first suitable public key found in the list.
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If no suitable encryption key is found.
 */
export const choosePublicKeyToEncrypt = (
  rpJwkKeys: Out<FetchJwks>["keys"]
): JWK => {
  // First try to find RSA keys which are more commonly used for encryption
  const encKeys = rpJwkKeys.filter((jwk) => jwk.use === "enc");

  // Prioritize EC keys first, then fall back to RSA keys if needed
  // io-react-native-jwt support only EC keys with P-256 or P-384 curves
  const ecEncKeys = encKeys.filter(
    (jwk) => jwk.kty === "EC" && (jwk.crv === "P-256" || jwk.crv === "P-384")
  );
  const rsaEncKeys = encKeys.filter((jwk) => jwk.kty === "RSA");

  // Select the first available key based on priority
  const encKey = ecEncKeys[0] || rsaEncKeys[0] || encKeys[0];

  if (encKey) {
    return encKey;
  }

  // No suitable key found
  throw new NoSuitableKeysFoundInEntityConfiguration(
    "No suitable public key found for encryption."
  );
};

/**
 * Builds a URL-encoded form body for a direct POST response without encryption.
 *
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains either the VP token to encrypt and the stringified mapping of the credential disclosures or the error code
 * @returns A URL-encoded string suitable for an `application/x-www-form-urlencoded` POST body.
 */
export const buildDirectPostBody = async (
  requestObject: Out<VerifyRequestObjectSignature>["requestObject"],
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
 * Builds a URL-encoded form body for a direct POST response using JWT encryption.
 *
 * @param jwkKeys - Array of JWKs from the Relying Party for encryption.
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains either the VP token to encrypt and the mapping of the credential disclosures or the error code
 * @param generatedNonce - Optional nonce for the `apu` claim in the JWE header, it is used during ISO 18013-7.
 * @returns A URL-encoded string for an `application/x-www-form-urlencoded` POST body,
 *          where `response` contains the encrypted JWE.
 */
export const buildDirectPostJwtBody = async (
  jwkKeys: Out<FetchJwks>["keys"],
  requestObject: Out<VerifyRequestObjectSignature>["requestObject"],
  payload: DirectAuthorizationBodyPayload,
  generatedNonce?: string
): Promise<string> => {
  // Prepare the authorization response payload to be encrypted
  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    ...payload,
  });

  const encPublicJwk = choosePublicKeyToEncrypt(jwkKeys);
  // Encrypt the authorization payload
  const { client_metadata } = requestObject;
  const encryptedResponse = await new EncryptJwe(authzResponsePayload, {
    alg:
      (client_metadata?.authorization_encrypted_response_alg as
        | "RSA-OAEP-256"
        | "RSA-OAEP") || "RSA-OAEP-256",
    enc:
      (client_metadata?.authorization_encrypted_response_enc as
        | "A256CBC-HS512"
        | "A128CBC-HS256") || "A256CBC-HS512",
    kid: encPublicJwk.kid,
    /* ISO 18013-7 */
    apv: Base64.encodeURI(requestObject.nonce),
    ...(generatedNonce ? { apu: Base64.encodeURI(generatedNonce) } : {}),
  }).encrypt(encPublicJwk);

  // Build the x-www-form-urlencoded form body
  const formBody = new URLSearchParams({
    response: encryptedResponse,
    ...(requestObject.state ? { state: requestObject.state } : {}),
  });
  return formBody.toString();
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationResponse = (
  requestObject: Out<VerifyRequestObjectSignature>["requestObject"],
  presentationDefinitionId: string,
  jwkKeys: Out<FetchJwks>["keys"],
  remotePresentation: RemotePresentation,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationResponseDcql = (
  requestObject: Out<VerifyRequestObjectSignature>["requestObject"],
  jwkKeys: Out<FetchJwks>["keys"],
  remotePresentation: RemotePresentation,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Sends the authorization response to the Relying Party (RP) using the specified `response_mode`.
 * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
 *
 * @param requestObject - The request details, including presentation requirements.
 * @param presentationDefinition - The definition of the expected presentation.
 * @param jwkKeys - Array of JWKs from the Relying Party for optional encryption.
 * @param presentation - Tuple with verifiable credential, claims, and crypto context.
 * @param context - Contains optional custom fetch implementation.
 * @returns Parsed and validated authorization response from the Relying Party.
 */
export const sendAuthorizationResponse: SendAuthorizationResponse = async (
  requestObject,
  presentationDefinitionId,
  jwkKeys,
  remotePresentation,
  { appFetch = fetch } = {}
): Promise<AuthorizationResponse> => {
  const { generatedNonce, presentations } = remotePresentation;
  /**
   * 1. Prepare the VP token and presentation submission
   * If there is only one credential, `vpToken` is a single string.
   * If there are multiple credential, `vpToken` is an array of string.
   **/
  const vp_token =
    presentations?.length === 1
      ? presentations[0]?.vpToken
      : presentations.map((presentation) => presentation.vpToken);

  const descriptor_map = presentations.map((presentation, index) => ({
    id: presentation.credentialId,
    path: presentations?.length === 1 ? `$` : `$[${index}]`,
    format: presentation.format,
  }));

  const presentation_submission = {
    id: uuid.v4(),
    definition_id: presentationDefinitionId,
    descriptor_map,
  };

  // 2. Choose the appropriate request body builder based on response mode
  const requestBody =
    requestObject.response_mode === "direct_post.jwt"
      ? await buildDirectPostJwtBody(
          jwkKeys,
          requestObject,
          {
            vp_token,
            presentation_submission,
          },
          generatedNonce
        )
      : await buildDirectPostBody(requestObject, {
          vp_token,
          presentation_submission: presentation_submission,
        });

  // 3. Send the authorization response via HTTP POST and validate the response
  const authResponse = await appFetch(requestObject.response_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(AuthorizationResponse.safeParse);

  // Some Relying Parties may return an empty body.
  return authResponse.success ? authResponse.data : {};
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationErrorResponse = (
  requestObject: Out<VerifyRequestObjectSignature>["requestObject"],
  error: ErrorResponse,
  jwkKeys: Out<FetchJwks>["keys"],
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
    jwkKeys,
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
    // 2. Choose the appropriate request body builder based on response mode
    const requestBody =
      requestObject.response_mode === "direct_post.jwt"
        ? await buildDirectPostJwtBody(jwkKeys, requestObject, { error })
        : await buildDirectPostBody(requestObject, { error });
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

export const sendAuthorizationResponseDcql: SendAuthorizationResponseDcql =
  async (
    requestObject,
    jwkKeys,
    remotePresentation,
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
    const { generatedNonce, presentations } = remotePresentation;
    // 1. Prepare the VP token as a JSON object with keys corresponding to the DCQL query credential IDs
    const requestBody = await buildDirectPostJwtBody(
      jwkKeys,
      requestObject,
      {
        vp_token: presentations.reduce(
          (acc, presentation) => ({
            ...acc,
            [presentation.credentialId]: presentation.vpToken,
          }),
          {} as Record<string, string>
        ),
      },
      generatedNonce
    );

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
