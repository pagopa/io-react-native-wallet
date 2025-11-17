import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import { type FetchJwks } from "./04-retrieve-rp-jwks";
import type { VerifyRequestObject } from "./05-verify-request-object";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
  type Out,
} from "../../utils/misc";
import {
  DirectAuthorizationBodyPayload,
  ErrorResponse,
  type PrepareRemotePresentations,
  type RemotePresentation,
} from "./types";
import * as z from "zod";
import type { JWK } from "../../utils/jwk";
import {
  IoWalletError,
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../utils/errors";
import { prepareVpToken } from "../../sd-jwt";
import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";
import { LogLevel, Logger } from "../../utils/logging";

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
 * Builds a URL-encoded form body for a direct POST response using JWT encryption.
 *
 * @param jwkKeys - Array of JWKs from the Relying Party for encryption.
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains the VP token to encrypt and the mapping of the credential disclosures
 * @returns A URL-encoded string for an `application/x-www-form-urlencoded` POST body, where `response` contains the encrypted JWE.
 */
export const buildDirectPostJwtBody = async (
  jwkKeys: Out<FetchJwks>["keys"],
  requestObject: Out<VerifyRequestObject>["requestObject"],
  payload: DirectAuthorizationBodyPayload,
  generatedNonce?: string
): Promise<string> => {
  type Jwe = ConstructorParameters<typeof EncryptJwe>[1];

  // Prepare the authorization response payload to be encrypted
  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    ...payload,
  });

  const encPublicJwk = choosePublicKeyToEncrypt(jwkKeys);

  // Encrypt the authorization payload
  const { encrypted_response_enc_values_supported = [] } =
    requestObject.client_metadata ?? {};

  const defaultAlg: Jwe["alg"] =
    encPublicJwk.kty === "EC" ? "ECDH-ES" : "RSA-OAEP-256";

  const encryptedResponse = await new EncryptJwe(authzResponsePayload, {
    alg: defaultAlg,
    enc:
      (encrypted_response_enc_values_supported[0] as Jwe["enc"]) || "A128GCM",
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
  requestObject: Out<VerifyRequestObject>["requestObject"],
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

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationResponse = (
  requestObject: Out<VerifyRequestObject>["requestObject"],
  jwkKeys: Out<FetchJwks>["keys"],
  remotePresentation: RemotePresentation,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

export const sendAuthorizationResponse: SendAuthorizationResponse = async (
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
          [presentation.credentialId]: [presentation.vpToken],
        }),
        {} as Record<string, string[]>
      ),
    },
    generatedNonce
  );

  Logger.log(
    LogLevel.DEBUG,
    `Sending Authorization Response to ${requestObject.response_uri} with body: ${requestBody}`
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
    .then(AuthorizationResponse.parse)
    .catch(handleAuthorizationResponseError);
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationErrorResponse = (
  requestObject: Out<VerifyRequestObject>["requestObject"],
  error: { error: ErrorResponse; errorDescription: string },
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Sends the authorization error response to the Relying Party (RP) using the specified `response_mode`.
 * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
 *
 * @param requestObject - The request details, including presentation requirements.
 * @param error - The response error value, with description
 * @param context - Contains optional custom fetch implementation.
 * @returns Parsed and validated authorization response from the Relying Party.
 */
export const sendAuthorizationErrorResponse: SendAuthorizationErrorResponse =
  async (
    requestObject,
    { error, errorDescription },
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
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
  // In case of ISO 18013-7 we need a nonce, it shall have a minimum entropy of 16
  const generatedNonce = generateRandomAlphaNumericString(16);

  const presentations = await Promise.all(
    credentials.map(async (item) => {
      Logger.log(
        LogLevel.DEBUG,
        "Preparing presentation for: " + JSON.stringify(item, null, 2)
      );

      const { credentialInputId, format } = item;
      if (format === "dc+sd-jwt") {
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
          requestedClaims: item.requestedClaims.map(({ name }) => name),
          credentialId: credentialInputId,
          vpToken: vp_token,
          format,
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
