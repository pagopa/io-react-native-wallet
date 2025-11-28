import type { DcqlQueryResult } from "dcql";

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
