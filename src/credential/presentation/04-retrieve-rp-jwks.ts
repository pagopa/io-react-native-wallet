import { JWKS, JWK } from "../../utils/jwk";
import { hasStatusOrThrow } from "../../utils/misc";
import { RelyingPartyEntityConfiguration } from "../../entity/trust/types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import { RequestObject } from "./types";
import {
  convertCertToPem,
  parsePublicKey,
  getSigningJwk,
} from "../../utils/crypto";

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
const getJwksFromX509Cert = async (certChain: string[]): Promise<JWK[]> => {
  if (!Array.isArray(certChain) || certChain.length === 0 || !certChain[0]) {
    throw new NoSuitableKeysFoundInEntityConfiguration(
      "No RP encrypt key found!"
    );
  }

  const pemCert = convertCertToPem(certChain[0]);
  const publicKey = parsePublicKey(pemCert);
  if (!publicKey) {
    throw new NoSuitableKeysFoundInEntityConfiguration(
      "Unsupported public key type."
    );
  }
  const signingJwk = getSigningJwk(publicKey);

  return [signingJwk];
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
 * Fetches the JSON Web Key Set (JWKS) based on the provided Request Object encoded as a JWT.
 * The retrieval process follows these steps in order:
 *
 * 1. **Direct JWK Retrieval**: If the JWT's protected header contains a `jwk` attribute, it uses this key directly.
 * 2. **X.509 Certificate Retrieval**: If the protected header includes an `x5c` attribute, it extracts the JWKs from the provided X.509 certificate chain.
 * 3. **Issuer's Well-Known Endpoint**: If neither `jwk` nor `x5c` are present, it constructs the JWKS URL using the issuer (`iss`) claim and fetches the keys from the issuer's well-known JWKS endpoint.
 *
 * The JWKS URL is constructed in the format `{issUrl.base}/.well-known/jar-issuer${issUrl.path}`,
 * as detailed in the SD-JWT VC issuer metadata specification.
 *
 * @param requestObjectEncodedJwt - The Request Object encoded as a JWT.
 * @param options - Optional parameters for fetching the JWKS.
 * @param options.context - Optional context providing a custom fetch implementation.
 * @param options.context.appFetch - A custom fetch function to replace the global `fetch` if provided.
 * @returns A promise that resolves to an object containing an array of JSON Web Keys (JWKs).
 * @throws {NoSuitableKeysFoundInEntityConfiguration} Throws an error if JWKS retrieval or key extraction fails.
 */
export const fetchJwksFromRequestObject: FetchJwks<
  [string, { context?: { appFetch?: GlobalFetch["fetch"] } }?]
> = async (requestObjectEncodedJwt, { context = {} } = {}) => {
  const { appFetch = fetch } = context;
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);
  const jwks: JWK[] = [];

  // 1. check if request object jwt contains the 'jwk' attribute
  if (requestObjectJwt.protectedHeader?.jwk) {
    const keys = [JWK.parse(requestObjectJwt.protectedHeader.jwk)];
    jwks.push(...keys);
  }

  // 2. check if request object jwt contains the 'x5c' attribute
  if (requestObjectJwt.protectedHeader.x5c) {
    const keys = await getJwksFromX509Cert(
      requestObjectJwt.protectedHeader.x5c
    );
    jwks.push(...keys);
  }

  // 3. check if client_metadata contains the 'jwks' or 'jwks_uri' attribute
  const requestObject = RequestObject.parse(requestObjectJwt.payload);
  const { client_metadata } = requestObject;

  if (client_metadata?.jwks_uri) {
    const fetchedJwks = await fetchJwksFromUri(
      new URL(client_metadata.jwks_uri).toString(),
      appFetch
    );
    jwks.push(...fetchedJwks);
  }

  if (client_metadata?.jwks) {
    jwks.push(...client_metadata.jwks.keys);
  }

  // 3. According to Potential profile, retrieve from RP endpoint using iss claim
  const issuer = requestObjectJwt.payload?.iss;
  if (jwks.length === 0 && typeof issuer === "string") {
    const wellKnownJwksUrl = constructWellKnownJwksUrl(issuer);
    const jwksKeys = await fetchJwksFromUri(wellKnownJwksUrl, appFetch);
    jwks.push(...jwksKeys);
  }

  if (jwks.length === 0) {
    throw new NoSuitableKeysFoundInEntityConfiguration(
      "Request Object signature verification"
    );
  }

  return { keys: jwks };
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
