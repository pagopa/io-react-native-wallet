import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import { fetchAuthorizationResponse as sdkFetchAuthorizationResponse } from "@pagopa/io-wallet-oid4vp";
import { b64tohex, hextob64u, KJUR, X509 } from "jsrsasign";

import type { JWK } from "../../utils/jwk";

import { mapSdkAuthorizationResponseError } from "../../credential/presentation/v1.4.6/sdkErrorMapper";
import { convertBase64DerToPem } from "../../utils/crypto";
import { IoWalletError, RelyingPartyResponseError } from "../../utils/errors";
import { hasStatusOrThrow } from "../../utils/misc";
import {
  AuthorizationResponseResult,
  type ClientMetadata,
  type RequestObject,
} from "./types";

/** JWE algorithm to encrypt the Authorization Response, as required by HAIP */
const ENCRYPTION_ALG = "ECDH-ES";

type EncryptionEnc = "A128CBC-HS256" | "A128GCM" | "A256CBC-HS512" | "A256GCM";

/** JWE content encryption algorithms supported by the native JWE implementation */
const ENCRYPTION_ENC_VALUES: EncryptionEnc[] = [
  "A128GCM",
  "A256GCM",
  "A128CBC-HS256",
  "A256CBC-HS512",
];

const isSupportedEnc = (enc: string): enc is EncryptionEnc =>
  (ENCRYPTION_ENC_VALUES as string[]).includes(enc);

/**
 * Wallet metadata sent to the Verifier when it fetches the Request Object with POST
 * (OpenID4VP 1.0, Section 10).
 */
export const WALLET_METADATA = {
  authorization_encryption_alg_values_supported: [ENCRYPTION_ALG],
  authorization_encryption_enc_values_supported: ENCRYPTION_ENC_VALUES,
  client_id_prefixes_supported: ["x509_san_dns", "x509_hash"],
  request_object_signing_alg_values_supported: ["ES256"],
  response_modes_supported: ["direct_post", "direct_post.jwt"],
  response_types_supported: ["vp_token"],
  vp_formats_supported: {
    "dc+sd-jwt": {
      "kb-jwt_alg_values": ["ES256"],
      "sd-jwt_alg_values": ["ES256"],
    },
    mso_mdoc: {
      deviceauth_alg_values: [-7],
      issuerauth_alg_values: [-7],
    },
  },
};

/**
 * Base64url SHA-256 hash of a DER certificate, as used by the `x509_hash` Client Identifier Prefix.
 * @param certificate - The base64 DER certificate
 */
export const getCertificateHash = (certificate: string) =>
  hextob64u(KJUR.crypto.Util.hashHex(b64tohex(certificate), "sha256"));

/**
 * DNS names in the Subject Alternative Name of a certificate,
 * as used by the `x509_san_dns` Client Identifier Prefix.
 * @param certificate - The base64 DER certificate
 */
export const getCertificateSanDnsNames = (certificate: string) => {
  const x509 = new X509();
  x509.readCertPEM(convertBase64DerToPem(certificate));
  return (x509.getExtSubjectAltName()?.array ?? []).flatMap((name) =>
    name && "dns" in name ? [name.dns] : [],
  );
};

/**
 * Selects the Verifier key to encrypt the Authorization Response with (OpenID4VP 1.0, Section 8.3).
 * @throws {IoWalletError} If the Verifier has no supported encryption key
 */
export const getEncryptionJwk = (clientMetadata?: ClientMetadata): JWK => {
  const jwk = clientMetadata?.jwks?.keys.find(
    (key) =>
      key.kty === "EC" &&
      (key.use === undefined || key.use === "enc") &&
      (key.alg === undefined || key.alg === ENCRYPTION_ALG),
  );
  if (!jwk) {
    throw new IoWalletError(
      "The Verifier has no supported key to encrypt the Authorization Response",
    );
  }
  return jwk;
};

/**
 * Sends the Authorization Response parameters to the `response_uri` of the Verifier:
 * - `direct_post.jwt`: encrypted in a JWE (OpenID4VP 1.0, Section 8.3), sent with the IO Wallet SDK;
 * - `direct_post`: as form parameters (Section 8.2), which the SDK does not support.
 * @param encryptionJwk - (optional) The Verifier key to encrypt with, selected from its metadata by default
 */
export const postAuthorizationResponse = async (
  requestObject: RequestObject,
  params: Record<string, unknown>,
  fetchFn: typeof fetch,
  encryptionJwk?: JWK,
): Promise<AuthorizationResponseResult> => {
  const responseParams = {
    ...params,
    ...(requestObject.state && { state: requestObject.state }),
  };

  if (requestObject.response_mode === "direct_post.jwt") {
    // The JWE is awaited in its own statement: with an `await` inside an object literal
    // in a conditional expression, the Hermes bundle produced `0` instead of the object.
    const jwe = await encryptResponse(
      requestObject,
      responseParams,
      encryptionJwk ?? getEncryptionJwk(requestObject.client_metadata),
    );
    return sdkFetchAuthorizationResponse({
      authorizationResponseJarm: jwe,
      callbacks: { fetch: fetchFn },
      presentationResponseUri: requestObject.response_uri,
    }).catch(mapSdkAuthorizationResponseError);
  }

  const body = Object.fromEntries(
    Object.entries(responseParams).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
  const response = await fetchFn(requestObject.response_uri, {
    body: new URLSearchParams(body).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  }).then(hasStatusOrThrow(200, RelyingPartyResponseError));

  // The Verifier may answer with an empty body when it has no redirect_uri
  const text = await response.text();
  return AuthorizationResponseResult.parse(text ? JSON.parse(text) : {});
};

const encryptResponse = (
  requestObject: RequestObject,
  responseParams: Record<string, unknown>,
  encryptionJwk: JWK,
) => {
  const encValues = requestObject.client_metadata
    ?.encrypted_response_enc_values_supported ?? ["A128GCM"];
  const enc = encValues.find(isSupportedEnc);
  if (!enc) {
    throw new IoWalletError(
      `Unsupported Authorization Response encryption: ${encValues.join(", ")}`,
    );
  }
  return new EncryptJwe(JSON.stringify(responseParams), {
    alg: ENCRYPTION_ALG,
    enc,
    ...(encryptionJwk.kid && { kid: encryptionJwk.kid }),
  }).encrypt(encryptionJwk);
};
