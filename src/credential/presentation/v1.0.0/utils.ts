import type { DcqlQueryResult } from "dcql";
import { JWKS, type JWK } from "../../../utils/jwk";
import type { RelyingPartyConfig } from "../api";

export type Credential4Dcql = [string /* keyTag */, string /* credential */];

/**
 * Extract valid claims from a successful `dcql` match. The extracted claims
 * come directly from the library, without any processing.
 * @param match The DCQL query match
 * @returns A list of raw `dcql` claims
 */
export const getValidDcqlClaims = (match: DcqlQueryResult.CredentialMatch) => {
  const validClaims = match.valid_credentials?.[0]?.claims?.valid_claims;

  if (!validClaims) return [];

  const [validClaimSet] =
    match.valid_credentials?.[0]?.claims?.valid_claim_sets ?? [];

  // If there is a valid claim set, only claims from that set must be disclosed
  // We select claims in the order they are defined in the set
  if (validClaimSet) {
    return (
      validClaimSet.valid_claim_indexes?.map(
        (i) => validClaims.find((c) => c.claim_index === i)!
      ) ?? []
    );
  }

  return validClaims;
};

/**
 * Fetches the JSON Web Key Set (JWKS) from the Relying Party's Entity Configuration.
 * @param rpConfig - The Relying Party's common configuration,
 * @returns An object containing an array of JSON Web Keys (JWKs).
 */
export const getJwksFromRpConfig = (
  rpConfig: RelyingPartyConfig
): { keys: JWK[] } => {
  const jwks = rpConfig.jwks.keys;

  if (!jwks || !Array.isArray(jwks)) {
    throw new Error("JWKS not found in Relying Party configuration.");
  }

  const parsed = JWKS.safeParse({ keys: jwks });
  if (!parsed.success) {
    throw new Error(
      "JWKS contains unsupported or invalid keys (only RSA/EC JWK supported)"
    );
  }

  return parsed.data;
};
