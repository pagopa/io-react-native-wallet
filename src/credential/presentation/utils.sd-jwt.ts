import { SDJwtInstance, type SDJwt } from "@sd-jwt/core";
import { getClaims } from "@sd-jwt/decode";
import { digest } from "@sd-jwt/crypto-nodejs";
import type {
  DcqlSdJwtVcCredential,
  DcqlClaimsQuery,
  DcqlQuery,
  DcqlQueryResult,
} from "dcql";
import { IoWalletError } from "../../utils/errors";
import { isObject } from "../../utils/misc";
import type { SdJwtDecoded } from "../offer/types";
import type { EvaluatedDisclosure, PresentationFrame } from "./types";
import { getValidDcqlClaims, type Credential4Dcql } from "./utils";

type CustomDcqlSdJwtVcCredential = DcqlSdJwtVcCredential & {
  original_credential: Credential4Dcql;
};

/**
 * List of claims to remove from the SD-JWT before evaluating the DCQL query.
 */
const NON_DISCLOSABLE_CLAIMS = ["status", "cnf", "exp"];

/**
 * Extract claims from disclosures for use in `dcql` library.
 */
const getClaimsFromDecodedSdJwt = async (decodedRawSdJwt: SDJwt) => {
  if (!decodedRawSdJwt.jwt?.payload) {
    throw new IoWalletError("Can't decode SD-JWT");
  }

  const claims = await getClaims<DcqlSdJwtVcCredential["claims"]>(
    decodedRawSdJwt.jwt.payload,
    decodedRawSdJwt.disclosures ?? [],
    digest
  );

  for (const claim of NON_DISCLOSABLE_CLAIMS) {
    delete claims[claim];
  }

  return claims;
};

/**
 * Convert a list of credential in SD-JWT format to a list of objects
 * with claims for correct parsing by the `dcql` library.
 * @param credentials The raw SD-JWT credentials
 * @returns List of `dcql` compatible objects
 */
export const mapCredentialsToObj = async (
  credentials: Credential4Dcql[]
): Promise<CustomDcqlSdJwtVcCredential[]> => {
  const sdJwt = new SDJwtInstance<SdJwtDecoded>({
    hasher: digest,
  });

  return Promise.all(
    credentials.map(async (credential) => {
      const decodedRawSdJwt = await sdJwt.decode(credential[1]);
      const claims = await getClaimsFromDecodedSdJwt(decodedRawSdJwt);
      return {
        vct: decodedRawSdJwt.jwt?.payload?.vct as string,
        credential_format: "dc+sd-jwt",
        cryptographic_holder_binding: true,
        claims,
        original_credential: credential,
      } satisfies CustomDcqlSdJwtVcCredential;
    })
  );
};

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
