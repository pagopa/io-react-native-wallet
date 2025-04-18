import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import { getJwksFromConfig, type FetchJwks } from "./04-retrieve-rp-jwks";
import type { VerifyRequestObject } from "./05-verify-request-object";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import {
  type RemotePresentation,
  DirectAuthorizationBodyPayload,
  ErrorResponse,
  type LegacyRemotePresentation,
} from "./types";
import * as z from "zod";
import type { JWK } from "../../utils/jwk";
import type { RelyingPartyEntityConfiguration } from "../../trust";
import {
  RelyingPartyResponseError,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
  RelyingPartyResponseErrorCodes,
} from "../../utils/errors";

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
 * @param rpJwkKeys - The array of JWKs retrieved from the RP entity configuration.
 * @returns The first suitable public key found in the list.
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If no suitable encryption key is found.
 */
export const choosePublicKeyToEncrypt = (
  rpJwkKeys: Out<FetchJwks>["keys"]
): JWK => {
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
  requestObject: Out<VerifyRequestObject>["requestObject"],
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  type Jwe = ConstructorParameters<typeof EncryptJwe>[1];

  // Prepare the authorization response payload to be encrypted
  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    ...payload,
  });
  // Choose a suitable public key for encryption
  const { keys } = getJwksFromConfig(rpConf);
  const encPublicJwk = choosePublicKeyToEncrypt(keys);

  // Encrypt the authorization payload
  const {
    authorization_encrypted_response_alg,
    authorization_encrypted_response_enc,
  } = rpConf.openid_credential_verifier;

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
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 * Use with `presentation_definition`.
 * @deprecated Use `sendAuthorizationResponse`
 */
export type SendLegacyAuthorizationResponse = (
  requestObject: Out<VerifyRequestObject>["requestObject"],
  presentationDefinitionId: string,
  remotePresentations: LegacyRemotePresentation[],
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
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
export const sendLegacyAuthorizationResponse: SendLegacyAuthorizationResponse =
  async (
    requestObject,
    presentationDefinitionId,
    remotePresentations,
    rpConf,
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
    /**
     * 1. Prepare the VP token and presentation submission
     * If there is only one credential, `vpToken` is a single string.
     * If there are multiple credential, `vpToken` is an array of string.
     **/
    const vp_token =
      remotePresentations?.length === 1
        ? remotePresentations[0]?.vpToken
        : remotePresentations.map(
            (remotePresentation) => remotePresentation.vpToken
          );

    const descriptor_map = remotePresentations.map(
      (remotePresentation, index) => ({
        id: remotePresentation.inputDescriptor.id,
        path: remotePresentations.length === 1 ? `$` : `$[${index}]`,
        format: remotePresentation.format,
      })
    );

    const presentation_submission = {
      id: uuid.v4(),
      definition_id: presentationDefinitionId,
      descriptor_map,
    };

    const requestBody = await buildDirectPostJwtBody(requestObject, rpConf, {
      vp_token,
      presentation_submission,
    });

    // 3. Send the authorization response via HTTP POST and validate the response
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
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 * Use with DCQL queries.
 */
export type SendAuthorizationResponse = (
  requestObject: Out<VerifyRequestObject>["requestObject"],
  remotePresentations: RemotePresentation[],
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

export const sendAuthorizationResponse: SendAuthorizationResponse = async (
  requestObject,
  remotePresentations,
  rpConf,
  { appFetch = fetch } = {}
): Promise<AuthorizationResponse> => {
  // 1. Prepare the VP token as a JSON object with keys corresponding to the DCQL query credential IDs
  const requestBody = await buildDirectPostJwtBody(requestObject, rpConf, {
    vp_token: remotePresentations.reduce(
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
    .then(AuthorizationResponse.parse)
    .catch(handleAuthorizationResponseError);
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationErrorResponse = (
  requestObject: Out<VerifyRequestObject>["requestObject"],
  error: ErrorResponse,
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
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
    rpConf,
    { appFetch = fetch } = {}
  ): Promise<AuthorizationResponse> => {
    const requestBody = await buildDirectPostJwtBody(requestObject, rpConf, {
      error,
    });

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
    .handle("*", {
      code: RelyingPartyResponseErrorCodes.RelyingPartyGenericError,
      message: "Unable to successfully send the Authorization Response",
    })
    .buildFrom(e);
};
