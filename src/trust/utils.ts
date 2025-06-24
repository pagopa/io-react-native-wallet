import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";

import type { JWK, JWTDecodeResult } from "../utils/jwk";
import { FederationError } from "./errors";
import type { TrustAnchorEntityConfiguration } from "./types";

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
  trustAnchorEntity: TrustAnchorEntityConfiguration
): string {
  const taHeaderKid = trustAnchorEntity.header.kid;
  const taSigningJwk = trustAnchorEntity.payload.jwks.keys.find(
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
