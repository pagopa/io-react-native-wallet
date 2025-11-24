import { DcqlQuery, DcqlError, DcqlQueryResult } from "dcql";
import { isValiError } from "valibot";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  CredentialFormat,
  EvaluatedDisclosure,
  RemotePresentation,
  PresentationFrame,
} from "./types";
import { CredentialsNotFoundError, type NotFoundDetail } from "./errors";
import { LogLevel, Logger } from "../../utils/logging";
import {
  getPresentationFrameFromDcqlMatch,
  getClaimsFromDcqlMatch,
  mapCredentialsSdJwtToObj,
} from "./utils.sd-jwt";

/**
 * The purpose for the credential request by the RP.
 */
type CredentialPurpose = {
  required: boolean;
  description?: string;
};

export type EvaluateDcqlQuery = (
  query: DcqlQuery.Input,
  credentialsSdJwt: [CryptoContext, string /* credential */][],
  credentialsMdoc?: [CryptoContext, string /* credential */][]
) => Promise<
  ({
    id: string;
    credential: string;
    cryptoContext: CryptoContext;
    requiredDisclosures: EvaluatedDisclosure[];
    presentationFrame: PresentationFrame;
    purposes: CredentialPurpose[];
  } & CredentialFormat)[]
>;

export type PrepareRemotePresentations = (
  credentials: {
    id: string;
    credential: string;
    cryptoContext: CryptoContext;
    requestedClaims: string[];
  }[],
  nonce: string,
  clientId: string
) => Promise<RemotePresentation[]>;

type DcqlMatchSuccess = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: true }
>;

type DcqlMatchFailure = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: false }
>;

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
 * Extract issues related to failed credentials
 */
const extractFailedCredentialsIssues = (
  queryResult: DcqlQueryResult
): NotFoundDetail[] => {
  return getDcqlQueryFailedMatches(queryResult).map(([id, match]) => {
    const issues = match.failed_credentials?.flatMap((c) => {
      if ("issues" in c.meta) {
        return Object.values(c.meta.issues).flat() as string[];
      }
      if (c.claims.failed_claim_sets) {
        return c.claims.failed_claim_sets.flatMap(
          (cs) => Object.values(cs.issues).flat() as string[]
        );
      }
      return [];
    });
    return { id, issues };
  });
};

export const evaluateDcqlQuery: EvaluateDcqlQuery = async (
  query,
  credentialsSdJwt
) => {
  const credentials = await mapCredentialsSdJwtToObj(credentialsSdJwt);

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const queryResult = DcqlQuery.query(parsedQuery, credentials);

    if (!queryResult.can_be_satisfied) {
      const issues = extractFailedCredentialsIssues(queryResult);
      for (const issue of issues) {
        Logger.log(
          LogLevel.ERROR,
          "Cannot satisfy DCQL: " + JSON.stringify(issue)
        );
      }
      throw new CredentialsNotFoundError(issues);
    }

    return getDcqlQueryMatches(queryResult).map(([id, match]) => {
      const purposes = queryResult.credential_sets
        ?.filter((set) => set.matching_options?.flat().includes(id))
        ?.map<CredentialPurpose>((credentialSet) => ({
          description: credentialSet.purpose?.toString(),
          required: Boolean(credentialSet.required),
        }));

      const matchOutput = match.valid_credentials[0]?.meta.output;

      if (matchOutput?.credential_format === "dc+sd-jwt") {
        // Build an object vct:credentialJwt to map matched credentials to their JWT
        const credentialsSdJwtByVct = credentials.reduce(
          (acc, c, i) => ({ ...acc, [c.vct]: credentialsSdJwt[i]! }),
          {} as Record<string, [CryptoContext, string /* credential */]>
        );

        const { vct } = matchOutput;
        const [cryptoContext, credential] = credentialsSdJwtByVct[vct]!;

        const requiredDisclosures = getClaimsFromDcqlMatch(match);
        const presentationFrame = getPresentationFrameFromDcqlMatch(
          match,
          parsedQuery
        );

        return {
          id,
          vct,
          cryptoContext,
          format: matchOutput.credential_format,
          credential,
          requiredDisclosures,
          presentationFrame,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html#section-6.3.1.2-2.1
          purposes: purposes ?? [{ required: true }],
        };
      }

      throw new Error(
        `Unsupported credential format: ${matchOutput?.credential_format}`
      );
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
