import { DcqlQuery, DcqlError, DcqlQueryResult } from "dcql";
import { isValiError } from "valibot";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { decode } from "../../../sd-jwt";
import { LEGACY_SD_JWT } from "../../../sd-jwt/types";
import {
  CredentialsNotFoundError,
  type NotFoundDetail,
} from "../common/errors";
import type { RemotePresentationApi } from "../api";
import type {
  CredentialPurpose,
  Disclosure,
} from "../api/06-evaluate-dcql-query";

type DcqlMatchSuccess = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: true }
>;

type DcqlMatchFailure = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: false }
>;

/**
 * Convert a credential in JWT format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialToObject = (jwt: string) => {
  const { sdJwt, disclosures } = decode(jwt);
  const credentialFormat = sdJwt.header.typ;

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

/**
 * Extract only failed matches from the DCQL query result.
 */
const getDcqlQueryFailedMatches = (result: DcqlQueryResult) =>
  Object.entries(result.credential_matches).filter(
    ([, match]) => match.success === false
  ) as [string, DcqlMatchFailure][];

/**
 * Extract missing credentials from the DCQL query result.
 * Note: here we are assuming a failed match is a missing credential,
 * but there might be other reasons for its failure.
 */
const extractMissingCredentials = (
  queryResult: DcqlQueryResult,
  originalQuery: DcqlQuery
): NotFoundDetail[] => {
  return getDcqlQueryFailedMatches(queryResult).map(([id]) => {
    const credential = originalQuery.credentials.find((c) => c.id === id);
    if (
      credential?.format !== "dc+sd-jwt" &&
      credential?.format !== LEGACY_SD_JWT
    ) {
      throw new Error("Unsupported format"); // TODO [SIW-2082]: support MDOC credentials
    }
    return { id, vctValues: credential.meta?.vct_values };
  });
};

export const evaluateDcqlQuery: RemotePresentationApi["evaluateDcqlQuery"] =
  async (credentialsSdJwt, query) => {
    const credentials = credentialsSdJwt.map(([, credential]) =>
      mapCredentialToObject(credential)
    );
    try {
      // Validate the query
      const parsedQuery = DcqlQuery.parse(query);
      DcqlQuery.validate(parsedQuery);

      const queryResult = DcqlQuery.query(parsedQuery, credentials);

      if (!queryResult.canBeSatisfied) {
        throw new CredentialsNotFoundError(
          extractMissingCredentials(queryResult, parsedQuery)
        );
      }

      // Build an object vct:credentialJwt to map matched credentials to their JWT
      const credentialsSdJwtByVct = credentials.reduce(
        (acc, c, i) => ({ ...acc, [c.vct]: credentialsSdJwt[i]! }),
        {} as Record<string, [CryptoContext, string /* credential */]>
      );

      return getDcqlQueryMatches(queryResult).map(([id, match]) => {
        if (
          match.output.credential_format !== "dc+sd-jwt" &&
          match.output.credential_format !== LEGACY_SD_JWT
        ) {
          throw new Error("Unsupported format"); // TODO [SIW-2082]: support MDOC credentials
        }
        const { vct, claims } = match.output;

        const purposes = queryResult.credential_sets
          ?.filter((set) => set.matching_options?.flat().includes(id))
          ?.map<CredentialPurpose>((credentialSet) => ({
            description: credentialSet.purpose?.toString(),
            required: Boolean(credentialSet.required),
          }));

        const [cryptoContext, credential] = credentialsSdJwtByVct[vct]!;
        const requiredDisclosures = Object.values(claims) as Disclosure[];
        return {
          id,
          vct,
          cryptoContext,
          credential,
          requiredDisclosures,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html#section-6.3.1.2-2.1
          purposes: purposes ?? [{ required: true }],
        };
      });
    } catch (error) {
      // Invalid DCQL query structure. Remap to `DcqlError` for consistency.
      if (isValiError(error)) {
        throw new DcqlError({
          message: "Failed to parse the provided DCQL query",
          code: "PARSE_ERROR",
          cause: error.issues,
        });
      }

      // Let other errors propagate so they can be caught with `err instanceof DcqlError`
      throw error;
    }
  };
