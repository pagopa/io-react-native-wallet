import { DcqlQuery, DcqlError, DcqlCredentialSetError } from "dcql";
import { isValiError } from "valibot";
import { decode } from "../../sd-jwt";
import type { Disclosure } from "../../sd-jwt/types";
import { ValidationFailed } from "../../utils/errors";

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

export const evaluateDcqlQuery = (
  credentialJwts: string[],
  query: DcqlQuery.Input
) => {
  const credentials = credentialJwts.map(mapCredentialToObject);

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const queryResult = DcqlQuery.query(parsedQuery, credentials);

    if (!queryResult.canBeSatisfied) {
      // TODO: handle query that cannot be satisfied, e.g. missing claims
    }

    return queryResult;
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
