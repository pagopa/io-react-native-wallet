import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";

import { hasStatusOrThrow } from "../../utils/misc";
import type { JWK, JWTDecodeResult } from "../../utils/jwk";
import { FederationError, FederationListParseError } from "./errors";
import type { TrustAnchorConfig } from "../api/TrustAnchorConfig";
import { FederationListResponse } from "./types";

export type FetchOptions = {
  appFetch?: GlobalFetch["fetch"];
};

export type ParsedToken = {
  header: JWTDecodeResult["protectedHeader"];
  payload: JWTDecodeResult["payload"];
};

// Verify a token signature
// The kid is extracted from the token header
export const verify = async (
  token: string,
  kid: string,
  jwks: JWK[]
): Promise<ParsedToken> => {
  const jwk = jwks.find((k) => k.kid === kid);
  if (!jwk) {
    throw new Error(`Invalid kid: ${kid}, token: ${token}`);
  }
  const { protectedHeader: header, payload } = await verifyJwt(token, jwk);
  return { header, payload };
};

/**
 * Return type for this function is necessary to avoid an issue during the bob build process.
 * It seems like typescript can't correctly infer the return type of the function.
 */
export const decode = (token: string): ParsedToken => {
  const { protectedHeader: header, payload } = decodeJwt(token);
  return { header, payload };
};

/**
 * Extracts the X.509 Trust Anchor certificate (Base64 encoded) from the
 * Trust Anchor's Entity Configuration.
 *
 * @param trustAnchorEntity The entity configuration of the known trust anchor.
 * @returns The Base64 encoded X.509 certificate string.
 * @throws {FederationError} If the certificate cannot be derived.
 */
export function getTrustAnchorX509Certificate(
  trustAnchorEntity: TrustAnchorConfig
): string {
  const taHeaderKid = trustAnchorEntity.jwt.header.kid;
  const taSigningJwk = trustAnchorEntity.keys.find(
    (key) => key.kid === taHeaderKid
  );

  if (!taSigningJwk) {
    throw new FederationError(
      `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' not found in Trust Anchor's JWKS.`,
      { trustAnchorKid: taHeaderKid, reason: "JWK not found for header kid" }
    );
  }

  if (taSigningJwk.x5c && taSigningJwk.x5c.length > 0 && taSigningJwk.x5c[0]) {
    return taSigningJwk.x5c[0];
  }

  throw new FederationError(
    `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' does not contain a valid 'x5c' certificate array.`,
    { trustAnchorKid: taHeaderKid, reason: "Missing or empty x5c in JWK" }
  );
}

/**
 * Fetch the signed entity configuration token for an entity
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param appFetch (optional) fetch api implementation
 * @returns The signed Entity Configuration token
 */
export async function getSignedEntityConfiguration(
  entityBaseUrl: string,
  { appFetch = fetch }: FetchOptions = {}
): Promise<string> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-federation`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());
}

/**
 * Fetch the entity statement document for a given federation entity.
 *
 * @param federationFetchEndpoint The exact endpoint provided by the parent EC's metadata.
 * @param subordinatedEntityBaseUrl The url that identifies the subordinate entity.
 * @param appFetch An optional instance of the http client to be used.
 * @returns The signed entity statement token.
 * @throws {IoWalletError} If the http request fails.
 */
export async function getSignedEntityStatement(
  federationFetchEndpoint: string,
  subordinatedEntityBaseUrl: string,
  { appFetch = fetch }: FetchOptions = {}
) {
  const url = new URL(federationFetchEndpoint);
  url.searchParams.set("sub", subordinatedEntityBaseUrl);

  return await appFetch(url.toString(), {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());
}

/**
 * Fetch the federation list document from a given endpoint.
 *
 * @param federationListEndpoint The URL of the federation list endpoint.
 * @param appFetch An optional instance of the http client to be used.
 * @returns The federation list as an array of strings.
 * @throws {IoWalletError} If the HTTP request fails.
 * @throws {FederationError} If the result is not in the expected format.
 */
export async function getFederationList(
  federationListEndpoint: string,
  { appFetch = fetch }: FetchOptions = {}
): Promise<string[]> {
  return await appFetch(federationListEndpoint, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((json) => {
      const result = FederationListResponse.safeParse(json);
      if (!result.success) {
        throw new FederationListParseError(
          `Invalid federation list format received from ${federationListEndpoint}. Error: ${result.error.message}`,
          { url: federationListEndpoint, parseError: result.error.toString() }
        );
      }
      return result.data;
    });
}
