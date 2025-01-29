import { JWKS, JWK } from "../../utils/jwk";
import { hasStatusOrThrow } from "../../utils/misc";
import { RelyingPartyEntityConfiguration } from "../../entity/trust/types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import type { JWTDecodeResult } from "@pagopa/io-react-native-jwt/lib/typescript/types";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import { RequestObject } from "./types";
import { X509, KEYUTIL, RSAKey, KJUR } from "jsrsasign";

/**
 * Defines the signature for a function that retrieves JSON Web Key Sets (JWKS) from a client.
 *
 * @template T - The tuple type representing the function arguments.
 * @param args - The arguments passed to the function.
 * @returns A promise resolving to an object containing an array of JWKs.
 */
export type FetchJwks<T extends Array<unknown> = []> = (...args: T) => Promise<{
  keys: JWK[];
}>;

/**
 * Converts a certificate string to PEM format.
 *
 * @param certificate - The certificate string.
 * @returns The PEM-formatted certificate.
 */
const convertCertToPem = (certificate: string): string =>
  `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;

/**
 * Parses the public key from a PEM-formatted certificate.
 *
 * @param pemCert - The PEM-formatted certificate.
 * @returns The public key object.
 * @throws Will throw an error if the public key is unsupported.
 */
const parsePublicKey = (pemCert: string): RSAKey | KJUR.crypto.ECDSA => {
  const x509 = new X509();
  x509.readCertPEM(pemCert);
  const publicKey = x509.getPublicKey();

  if (publicKey instanceof RSAKey || publicKey instanceof KJUR.crypto.ECDSA) {
    return publicKey;
  }

  throw new NoSuitableKeysFoundInEntityConfiguration(
    "Unsupported public key type."
  );
};

/**
 * Retrieves the signing JWK from the public key.
 *
 * @param publicKey - The public key object.
 * @returns The signing JWK.
 */
const getSigningJwk = (publicKey: RSAKey | KJUR.crypto.ECDSA): JWK => ({
  ...JWK.parse(KEYUTIL.getJWKFromKey(publicKey)),
  use: "sig",
});

/**
 * Fetches and parses JWKS from a given URI.
 *
 * @param jwksUri - The JWKS URI.
 * @param fetchFn - The fetch function to use.
 * @returns An array of JWKs.
 */
const fetchJwksFromUri = async (
  jwksUri: string,
  appFetch: GlobalFetch["fetch"]
): Promise<JWK[]> => {
  const jwks = await appFetch(jwksUri, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((raw) => raw.json())
    .then((json) => (json.jwks ? JWKS.parse(json.jwks) : JWKS.parse(json)));
  return jwks.keys;
};

/**
 * Retrieves JWKS when the client ID scheme includes x509 SAN DNS.
 *
 * @param decodedJwt - The decoded JWT.
 * @param fetchFn - The fetch function to use.
 * @returns An array of JWKs.
 * @throws Will throw an error if no suitable keys are found.
 */
const getJwksFromX509Cert = async (
  decodedJwt: JWTDecodeResult,
  appFetch: GlobalFetch["fetch"]
): Promise<JWK[]> => {
  const requestObject = RequestObject.parse(decodedJwt.payload);
  const jwks: JWK[] = [];

  const certChain = decodedJwt.protectedHeader.x5c;

  if (!Array.isArray(certChain) || certChain.length === 0 || !certChain[0]) {
    throw new NoSuitableKeysFoundInEntityConfiguration(
      "No RP encrypt key found!"
    );
  }

  const pemCert = convertCertToPem(certChain[0]);
  const publicKey = parsePublicKey(pemCert);
  const signingJwk = getSigningJwk(publicKey);

  jwks.push(signingJwk);

  const { client_metadata } = requestObject;

  if (client_metadata?.jwks_uri) {
    const fetchedJwks = await fetchJwksFromUri(
      client_metadata.jwks_uri,
      appFetch
    );
    jwks.push(...fetchedJwks);
  }

  if (client_metadata?.jwks) {
    jwks.push(...client_metadata.jwks.keys);
  }

  return jwks;
};

/**
 * Constructs the well-known JWKS URL based on the issuer claim.
 *
 * @param issuer - The issuer URL.
 * @returns The well-known JWKS URL.
 */
const constructWellKnownJwksUrl = (issuer: string): string => {
  const issuerUrl = new URL(issuer);
  return new URL(
    `/.well-known/jar-issuer${issuerUrl.pathname}`,
    `${issuerUrl.protocol}//${issuerUrl.host}`
  ).toString();
};

/**
 * Retrieves the JSON Web Key Set (JWKS) from the specified client's well-known endpoint.
 * It is formed using `{issUrl.base}/.well-known/jar-issuer${issUrl.pah}` as explained in SD-JWT VC issuer metadata section
 *
 * @param requestObjectEncodedJwt - Request Object in JWT format.
 * @param options - Optional context containing a custom fetch implementation.
 * @param options.context - Optional context object.
 * @param options.context.appFetch - Optional custom fetch function to use instead of the global `fetch`.
 * @returns A promise resolving to an object containing an array of JWKs.
 * @throws Will throw an error if the JWKS retrieval fails.
 */
export const fetchJwksFromRequestObject: FetchJwks<
  [string, { context?: { appFetch?: GlobalFetch["fetch"] } }]
> = async (requestObjectEncodedJwt, { context = {} } = {}) => {
  const { appFetch = fetch } = context;
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

  // 1. check if request object jwt contains the 'jwk' attribute
  if (requestObjectJwt.protectedHeader?.jwk) {
    return {
      keys: [JWK.parse(requestObjectJwt.protectedHeader.jwk)],
    };
  }

  // 2. check if request object jwt contains the 'x5c' attribute
  if (requestObjectJwt.protectedHeader.x5c) {
    const keys = await getJwksFromX509Cert(requestObjectJwt, appFetch);
    return {
      keys,
    };
  }

  // 3. According to Potential profile, retrieve from RP endpoint using iss claim
  const issuer = requestObjectJwt.payload?.iss;
  if (typeof issuer === "string") {
    const wellKnownJwksUrl = constructWellKnownJwksUrl(issuer);
    const jwksKeys = await fetchJwksFromUri(wellKnownJwksUrl, appFetch);
    return { keys: jwksKeys };
  }

  throw new NoSuitableKeysFoundInEntityConfiguration(
    "Request Object signature verification"
  );
};

/**
 * Retrieves the JSON Web Key Set (JWKS) from a Relying Party's entity configuration.
 *
 * @param rpConfig - The configuration object of the Relying Party entity.
 * @returns An object containing an array of JWKs.
 * @throws Will throw an error if the configuration is invalid or if JWKS is not found.
 */
export const fetchJwksFromConfig: FetchJwks<
  [RelyingPartyEntityConfiguration["payload"]["metadata"]]
> = async (rpConfig) => {
  const jwks = rpConfig.wallet_relying_party.jwks;

  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error("JWKS not found in Relying Party configuration.");
  }

  return {
    keys: jwks.keys,
  };
};
