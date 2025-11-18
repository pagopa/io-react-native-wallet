import { DcqlQuery, DcqlError, DcqlQueryResult } from "dcql";
import { isValiError } from "valibot";
import { b64utob64 } from "jsrsasign";
import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decode } from "../../sd-jwt";
import { type Disclosure } from "../../sd-jwt/types";
import type { CredentialFormat, EvaluatedDisclosure } from "./types";
import { CredentialsNotFoundError, type NotFoundDetail } from "./errors";
import { LogLevel, Logger } from "../../utils/logging";

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
    keyTag: string;
    requiredDisclosures: EvaluatedDisclosure[];
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
 * Convert a credential in SD-JWT format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialSdJwtToObj = (credentials: Credential4Dcql[]) =>
  credentials.map((credential) => {
    const { sdJwt, disclosures } = decode(credential[1]);
    const credentialFormat = sdJwt.header.typ;

    return {
      original_credential: credential,
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
  });

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
    if (credential?.format !== "dc+sd-jwt") {
      throw new Error("Unsupported format"); // TODO [SIW-2082]: support MDOC credentials
    }
    return { id, vctValues: credential.meta?.vct_values };
  });
};

export const evaluateDcqlQuery: EvaluateDcqlQuery = async (
  query,
  credentialsSdJwt,
  credentialsMdoc = []
) => {
  const credentials = [
    ...mapCredentialSdJwtToObj(credentialsSdJwt),
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

    if (!queryResult.canBeSatisfied) {
      const missingCredentials = extractMissingCredentials(
        queryResult,
        parsedQuery
      );
      Logger.log(
        LogLevel.ERROR,
        "Missing credentials: " + JSON.stringify(missingCredentials)
      );
      throw new CredentialsNotFoundError(missingCredentials);
    }

    return getDcqlQueryMatches(queryResult).map(([id, match]) => {
      const purposes = queryResult.credential_sets
        ?.filter((set) => set.matching_options?.flat().includes(id))
        ?.map<CredentialPurpose>((credentialSet) => ({
          description: credentialSet.purpose?.toString(),
          required: Boolean(credentialSet.required),
        }));

      if (match.output.credential_format === "dc+sd-jwt") {
        const { vct, claims } = match.output;
        const [keyTag, credential] = credentialsById[vct]!;

        const requiredDisclosures = Object.values(claims).map((item) => {
          const [_, name, value] = item as [string, string, string];
          return { name, value };
        }) as EvaluatedDisclosure[];

        return {
          id,
          vct,
          keyTag,
          format: match.output.credential_format,
          credential,
          requiredDisclosures,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6.4.2
          purposes: purposes ?? [{ required: true }],
        };
      }

      if (match.output.credential_format === "mso_mdoc") {
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
      }

      throw new Error(
        `Unsupported credential format: ${match.output.credential_format}`
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
