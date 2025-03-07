import {
  DcqlQuery,
  DcqlError,
  DcqlCredentialSetError,
  DcqlQueryResult,
} from "dcql";
import { isValiError } from "valibot";
import { decode } from "../../sd-jwt";
import type { Disclosure, DisclosureWithEncoded } from "../../sd-jwt/types";
import { ValidationFailed } from "../../utils/errors";

type EvaluateDcqlQuery = (
  credentialsSdJwt: [string /* keyTag */, string /* credential */][],
  query: DcqlQuery.Input
) => {
  requiredDisclosures: DisclosureWithEncoded[];
  credential: string;
  keyTag: string;
}[];

type DcqlMatchSuccess = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: true }
>;

/**
 * Convert a credential in JWT format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialToObject = (jwt: string) => {
  const { sdJwt, disclosures } = decode(jwt);
  const credentialFormat = sdJwt.header.typ;

  // TODO [SIW-2082]: support MDOC credentials
  if (credentialFormat !== "vc+sd-jwt") {
    throw new Error(`Unsupported credential format: ${credentialFormat}`);
  }

  return {
    vct: sdJwt.payload.vct,
    credential_format: credentialFormat,
    claims: disclosures.reduce(
      (acc, disclosure) => ({
        ...acc,
        [disclosure.decoded[1]]: disclosure.decoded,
      }),
      {} as Record<string, Disclosure>
    ),
  };
};

/**
 * Extract only successful matches from the DCQL query result.
 */
const getDcqlQueryMatches = (result: DcqlQueryResult) =>
  Object.entries(result.credential_matches).filter(
    ([, match]) => match.success === true
  ) as [string, DcqlMatchSuccess][];

export const evaluateDcqlQuery: EvaluateDcqlQuery = (
  credentialsSdJwt,
  query
) => {
  const credentials = credentialsSdJwt.map(([, credential]) =>
    mapCredentialToObject(credential)
  );

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const queryResult = DcqlQuery.query(parsedQuery, credentials);

    if (!queryResult.canBeSatisfied) {
      throw new Error("No credential can satisfy the provided DCQL query");
    }

    // Build an object vct:credentialJwt to map matched credentials to their JWT
    const credentialsSdJwtByVct = credentials.reduce(
      (acc, c, i) => ({ ...acc, [c.vct]: credentialsSdJwt[i]! }),
      {} as Record<string, [string /* keyTag */, string /* credential */]>
    );

    return getDcqlQueryMatches(queryResult).map(([id, match]) => {
      if (match.output.credential_format !== "vc+sd-jwt") {
        throw new Error("Unsupported format"); // TODO [SIW-2082]: support MDOC credentials
      }

      const [keyTag, credential] = credentialsSdJwtByVct[match.output.vct]!;
      const requiredDisclosures = Object.values(
        match.output.claims
      ) as DisclosureWithEncoded[];

      return {
        id,
        keyTag,
        credential,
        requiredDisclosures,
      };
    });
  } catch (error) {
    // Invalid DCQL query structure
    if (isValiError(error)) {
      throw new ValidationFailed({
        message: "Invalid DCQL query",
        reason: error.issues.map((issue) => issue.message).join(", "),
      });
    }

    if (error instanceof DcqlError) {
      // TODO handle invalid DQCL query or let the error propagate
    }
    if (error instanceof DcqlCredentialSetError) {
      // TODO handle missing credentials or let the error propagate
    }
    throw error;
  }
};
