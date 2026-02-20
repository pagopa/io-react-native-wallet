import type { DcqlClaimsQuery, DcqlQuery, DcqlQueryResult } from "dcql";
import { isObject } from "../../../../utils/misc";
import type { EvaluatedDisclosure, PresentationFrame } from "../../api/types";

/**
 * Extract a compact list of claims from the `dcql` result.
 * @param match The DCQL query match
 * @returns The list of claims in {@link EvaluatedDisclosure} format
 */
export const getClaimsFromDcqlMatch = (
  match: DcqlQueryResult.CredentialMatch
): EvaluatedDisclosure[] =>
  getValidDcqlClaims(match).flatMap((c) =>
    Object.entries(c.output).map(([name, value]) => ({ name, value }))
  );

/**
 * Recursively convert a claim path to a {@link PresentationFrame} for `@sd-jwt/present`
 * @param path The claim path array
 * @param claim The decoded claim
 * @returns A presentation frame compatible with `@sd-jwt/present`
 */
export const pathToPresentationFrame = (
  path: (string | number | null)[],
  claim: Record<string, unknown>
): PresentationFrame => {
  const [segment, ...rest] = path;

  // Base case: no more path segments to process
  if (segment === undefined) {
    // @ts-expect-error unwind recursion
    return true;
  }

  // null path segments (lists) must include all elements in the list
  if (segment === null) {
    const [maybeArrayClaim] = Object.values(claim);
    if (Array.isArray(maybeArrayClaim)) {
      return maybeArrayClaim.reduce(
        (acc, c, i) => ({ ...acc, [i]: pathToPresentationFrame(rest, c) }),
        {}
      );
    }
    // @ts-expect-error unwind recursion
    return true;
  }

  return {
    [segment]: pathToPresentationFrame(rest, claim),
  };
};

/**
 * Build a presentation frame from the `dcql` result to use for disclosing the requested claims.
 * @param match The DCQL query match
 * @param originalQuery The original DCQL query
 * @returns A presentation frame compatible with `@sd-jwt/present`
 */
export const getPresentationFrameFromDcqlMatch = (
  match: DcqlQueryResult.CredentialMatch,
  originalQuery: DcqlQuery
): PresentationFrame => {
  // The original DCQL query claims are needed to get their path
  const queryClaims =
    originalQuery.credentials.find(({ id }) => id === match.credential_query_id)
      ?.claims ?? [];

  if (queryClaims.length === 0) return {};

  const typedQueryClaims = queryClaims as DcqlClaimsQuery.W3cAndSdJwtVc[];

  // Build a presentation frame from each claim's path
  return getValidDcqlClaims(match).reduce((acc, c) => {
    const pf = pathToPresentationFrame(
      typedQueryClaims[c.claim_index]!.path,
      c.output
    );
    // Merge objects with the same key to not lose objects that are already in the accumulator
    for (const [key, value] of Object.entries(pf)) {
      acc[key] = isObject(value) ? Object.assign(value, acc[key]) : value;
    }
    return acc;
  }, {} as PresentationFrame);
};

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
