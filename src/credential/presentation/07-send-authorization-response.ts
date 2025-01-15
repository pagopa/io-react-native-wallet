import { EncryptJwe, SignJWT } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import type { FetchJwks } from "./03-retrieve-jwks";
import type { JWK } from "@pagopa/io-react-native-jwt/lib/typescript/types";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { GetRequestObject } from "./04-get-request-object";
import { disclose } from "../../sd-jwt";
import { type Presentation } from "./types";
import * as z from "zod";
import { sha256 } from "js-sha256";

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string(),
  response_code: z
    .string() /**
      FIXME: [SIW-627] we expect this value from every RP implementation
      Actually some RP does not return the value
      We make it optional to not break the flow.
    */
    .optional(),
});

/**
 * Selects an RSA public key (with `use = enc` and `kty = RSA`) from the set of JWK keys
 * offered by the Relying Party (RP) for encryption.
 *
 * @param rpJwkKeys - The array of JWKs retrieved from the RP entity configuration.
 * @returns The first suitable RSA public key found in the list.
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If no suitable RSA encryption key is found.
 */
export const chooseRSAPublicKeyToEncrypt = (
  rpJwkKeys: Out<FetchJwks>["keys"]
): JWK => {
  const [rsaEncKey] = rpJwkKeys.filter(
    (jwk) => jwk.use === "enc" && jwk.kty === "RSA"
  );

  if (rsaEncKey) {
    return rsaEncKey;
  }

  // No suitable key found
  throw new NoSuitableKeysFoundInEntityConfiguration(
    "No suitable RSA public key found for encryption."
  );
};

/**
 * Prepares a Verified Presentation (VP) token to be sent as part of an
 * authorization response in an OpenID 4 Verifiable Presentations flow.
 *
 * @param requestObject - The request object containing the nonce, response URI, and other necessary info.
 * @param presentationTuple - A tuple containing a verifiable credential, the claims to disclose,
 *                            and a cryptographic context for signing.
 * @returns An object containing the signed VP token (`vp_token`) and a `presentation_submission` object.
 *
 * @remarks
 *  1. The `disclose()` function is used to produce a token with only the requested claims.
 *  2. A new JWT is then signed, including the VP, `jti`, `iss`, `nonce`, audience, and expiration.
 *  3. The `presentation_submission` object follows the OpenID 4 VP specification for describing
 *     how the disclosed credentials map to the request.
 *
 * @todo [SIW-353] Support multiple verifiable credentials in a single request.
 */
export const prepareVpToken = async (
  requestObject: Out<GetRequestObject>["requestObject"],
  [verifiableCredential, requestedClaims, cryptoContext]: Presentation
): Promise<{
  vp_token: string;
  presentation_submission: Record<string, unknown>;
}> => {
  // Produce a VP token with only requested claims from the verifiable credential
  const { token: vp } = await disclose(verifiableCredential, requestedClaims);

  const sd_hash = sha256(vp);

  const kbJwt = await new SignJWT(cryptoContext)
    .setProtectedHeader({
      typ: "kb+jwt",
      alg: "ES256",
    })
    .setPayload({
      sd_hash,
      nonce: requestObject.nonce,
    })
    .setAudience(requestObject.response_uri)
    .setIssuedAt()
    .sign();

  // <Issuer-signed JWT>~<Disclosure 1>~...~<Disclosure N>~<KB-JWT>
  const vp_token = [vp, kbJwt].join("~");

  // Build the presentation_submission structure to map the credential
  const descriptorMapId =
    requestObject.scope ||
    requestObject.presentation_definition?.input_descriptors[0]?.id;
  const presentation_submission = {
    id: uuid.v4(),
    definition_id: requestObject.presentation_definition?.id,
    descriptor_map: [
      {
        id: descriptorMapId,
        path: `$`,
        format: "vc+sd-jwt",
      },
    ],
  };

  return { vp_token, presentation_submission };
};

/**
 * Constructs a form-urlencoded body for direct POST response mode (without encryption).
 *
 * @param requestObject - The request object containing relevant information such as state and nonce.
 * @param vpToken - The signed VP token to include in the POST body.
 * @param presentationSubmission - The presentation submission object describing the credential mapping.
 * @returns A string suitable for use as the body in a `application/x-www-form-urlencoded` POST request.
 */
export const buildBodyByDirectPost = async (
  requestObject: Out<GetRequestObject>["requestObject"],
  vpToken: string,
  presentationSubmission: Record<string, unknown>
): Promise<string> => {
  const formBody = new URLSearchParams({
    state: requestObject.state,
    presentation_submission: JSON.stringify(presentationSubmission),
    nonce: requestObject.nonce,
    vp_token: vpToken,
  });

  return formBody.toString();
};

/**
 * Constructs a form-urlencoded body for direct POST response mode with JWT encryption (`direct_post.jwt`).
 *
 * @param rpJwkKeys - The array of JWKs offered by the Relying Party for encryption.
 * @param requestObject - The request object containing relevant information such as state and nonce.
 * @param vpToken - The signed VP token to encrypt.
 * @param presentationSubmission - The presentation submission object describing the credential mapping.
 * @returns A string suitable for use as the body in a `application/x-www-form-urlencoded` POST request,
 *          where `response` is an encrypted JWE containing the authorization data.
 */
export const buildBodyByDirectPostJwt = async (
  rpJwkKeys: Out<FetchJwks>["keys"],
  requestObject: Out<GetRequestObject>["requestObject"],
  vpToken: string,
  presentationSubmission: Record<string, unknown>
): Promise<string> => {
  // Prepare the authorization response payload to be encrypted
  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    presentation_submission: presentationSubmission,
    nonce: requestObject.nonce,
    vp_token: vpToken,
  });

  // Choose a suitable RSA public key for encryption
  const rsaPublicJwk = chooseRSAPublicKeyToEncrypt(rpJwkKeys);

  // Encrypt the authorization payload
  const encryptedResponse = await new EncryptJwe(authzResponsePayload, {
    alg: "RSA-OAEP-256",
    enc: "A256CBC-HS512",
    kid: rsaPublicJwk.kid,
  }).encrypt(rsaPublicJwk);

  // Build the x-www-form-urlencoded form body
  const formBody = new URLSearchParams({ response: encryptedResponse });
  return formBody.toString();
};

/**
 * Type definition for the function that sends the authorization response
 * to the Relying Party, completing the presentation flow.
 */
export type SendAuthorizationResponse = (
  requestObject: Out<GetRequestObject>["requestObject"],
  jwkKeys: Out<FetchJwks>["keys"],
  presentation: Presentation, // TODO: [SIW-353] support multiple presentations
  context: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Sends the authorization response to the Relying Party (RP) using the specified `response_mode`.
 * This function completes the presentation flow in an OpenID 4 Verifiable Presentations scenario.
 *
 * @param requestObject - The request object describing the presentation requirements.
 * @param rpJwKeys - The array of JWKs offered by the Relying Party for optional encryption (`direct_post.jwt`).
 * @param presentation - A tuple containing the verifiable credential, the claims to disclose, and the cryptographic context.
 * @param context - An object containing the wallet instance attestation token and an optional fetch implementation.
 * @returns The parsed authorization response from the RP, validated by `AuthorizationResponse`.
 */
export const sendAuthorizationResponse: SendAuthorizationResponse = async (
  requestObject,
  rpJwKeys,
  presentation,
  { appFetch = fetch }
): Promise<AuthorizationResponse> => {
  // 1. Prepare the VP token and the presentation_submission object.
  const { vp_token, presentation_submission } = await prepareVpToken(
    requestObject,
    presentation
  );

  // 2. Decide how to build the body based on the requested response mode.
  let requestBody: string;
  if (requestObject.response_mode === "direct_post.jwt") {
    requestBody = await buildBodyByDirectPostJwt(
      rpJwKeys,
      requestObject,
      vp_token,
      presentation_submission
    );
  } else {
    requestBody = await buildBodyByDirectPost(
      requestObject,
      vp_token,
      presentation_submission
    );
  }

  // 3. Send the final authorization response via POST and validate the status and payload.
  return appFetch(requestObject.response_uri, {
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
