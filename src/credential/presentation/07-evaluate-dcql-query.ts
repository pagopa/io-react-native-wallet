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

type Credential4Dcql = [string /* keyTag */, string /* credential */];

export type EvaluateDcqlQuery = (
  query: DcqlQuery.Input,
  credentialsSdJwt: Credential4Dcql[],
  credentialsMdoc?: Credential4Dcql[]
) => Promise<
  ({
    id: string;
    credential: string;
    // cryptoContext: CryptoContext;
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
 * Convert a credential in Mdoc format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialsMdocToObj = async (credentialsMdoc: Credential4Dcql[]) => {
  return await Promise.all(
    credentialsMdoc.map(async (credential) => {
      const issuerSigned = await CBOR.decodeIssuerSigned(
        b64utob64(credential[1])
      );

      const namespaces = Object.entries(issuerSigned.nameSpaces).reduce(
        (acc, [ns, nsClaims]) => {
          const flattenNsClaims = Object.entries(nsClaims).reduce(
            (ac, [, el]) => ({
              ...ac,
              [el.elementIdentifier]: el.elementValue,
            }),
            {} as Record<string, unknown>
          );

          return {
            ...acc,
            [ns]: flattenNsClaims,
          };
        },
        {} as Record<string, unknown>
      );

      return {
        original_credential: credential,
        credential_format: "mso_mdoc",
        doctype: issuerSigned.issuerAuth.payload.docType || "missing_doctype",
        namespaces,
      };
    })
  );
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
  const credentials = [
    ...(await mapCredentialsSdJwtToObj(credentialsSdJwt)),
    ...(await mapCredentialsMdocToObj(credentialsMdoc)),
  ];

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
          {} as Record<string, [string /* keytag */, string /* credential */]>
        );

        const { vct } = matchOutput;
        const [keyTag, credential] = credentialsSdJwtByVct[vct]!;

        const requiredDisclosures = getClaimsFromDcqlMatch(match);
        const presentationFrame = getPresentationFrameFromDcqlMatch(
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

      /* if (match.output.credential_format === "mso_mdoc") {
        const { doctype, namespaces } = match.output;
        const [keyTag, credential] = credentialsById[doctype]!;

        const requiredDisclosures = Object.entries(namespaces).reduce(
          (acc, [ns, nsClaims]) => [
            ...acc,
            ...Object.entries(nsClaims).map(([claimName]) => ({
              namespace: ns,
              name: claimName,
              value: nsClaims[claimName],
            })),
          ],
          [] as EvaluatedDisclosure[]
        );

        return {
          id,
          keyTag,
          format: match.output.credential_format,
          credential,
          requiredDisclosures,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6.4.2
          purposes: purposes ?? [{ required: true }],
          doctype,
        };
      } */

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
