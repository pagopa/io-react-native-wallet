import { DcqlQuery, DcqlError, DcqlQueryResult } from "dcql";
import { isValiError } from "valibot";
import type {
  CredentialFormat,
  EvaluatedDisclosure,
  PresentationFrame,
} from "./types";
import { CredentialsNotFoundError, type NotFoundDetail } from "./errors";
import { LogLevel, Logger } from "../../utils/logging";
import type { Credential4Dcql } from "./utils";
import * as sdJwtUtils from "./utils.sd-jwt";
import * as mdocUtils from "./utils.mdoc";

/**
 * The purpose for the credential request by the RP.
 */
type CredentialPurpose = {
  required: boolean;
  description?: string;
};

export type EvaluateDcqlQuery = (
  query: DcqlQuery.Input,
  credentialsSdJwt: Credential4Dcql[],
  credentialsMdoc?: Credential4Dcql[]
) => Promise<
  ({
    id: string;
    credential: string;
    keyTag: string;
    requiredDisclosures: EvaluatedDisclosure[];
    presentationFrame: PresentationFrame;
    purposes: CredentialPurpose[];
  } & CredentialFormat)[]
>;

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
  credentialsSdJwt,
  credentialsMdoc = []
) => {
  const credentials = (
    await Promise.all([
      sdJwtUtils.mapCredentialsToObj(credentialsSdJwt),
      mdocUtils.mapCredentialsToObj(credentialsMdoc),
    ])
  ).flat();

  // Build a dictionary <id>:<credential> to map DCQL matches with the raw credential
  const credentialsById = credentials.reduce(
    (acc, c) => ({
      ...acc,
      ["vct" in c ? c.vct : c.doctype]: c.original_credential,
    }),
    {} as Record<string, Credential4Dcql>
  );

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(
      mdocUtils.ensurePidAttributesCompliance(query)
    );
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
        const { vct } = matchOutput;
        const [keyTag, credential] = credentialsById[vct]!;

        const requiredDisclosures = sdJwtUtils.getClaimsFromDcqlMatch(match);
        const presentationFrame = sdJwtUtils.getPresentationFrameFromDcqlMatch(
          match,
          parsedQuery
        );

        return {
          id,
          vct,
          keyTag,
          format: matchOutput.credential_format,
          credential,
          requiredDisclosures,
          presentationFrame,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6.4.2
          purposes: purposes ?? [{ required: true }],
        };
      }

      if (matchOutput?.credential_format === "mso_mdoc") {
        const { doctype } = matchOutput;
        const [keyTag, credential] = credentialsById[doctype]!;

        const requiredDisclosures = mdocUtils.getClaimsFromDcqlMatch(match);
        const presentationFrame = mdocUtils.getPresentationFrameFromClaims(
          requiredDisclosures,
          doctype
        );

        return {
          id,
          doctype,
          keyTag,
          format: matchOutput.credential_format,
          credential,
          requiredDisclosures,
          presentationFrame,
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
