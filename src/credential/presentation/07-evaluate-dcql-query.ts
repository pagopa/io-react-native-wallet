import {
  DcqlQuery,
  DcqlError,
  DcqlCredentialSetError,
  DcqlQueryResult,
  DcqlCredential,
} from "dcql";
import { isValiError } from "valibot";
import { decode } from "../../sd-jwt";
import type { Disclosure } from "../../sd-jwt/types";
import { ValidationFailed } from "../../utils/errors";
import { CredentialNotFoundError } from "./errors";
import type { CredentialFormat, EvaluatedDisclosure } from "./types";
import { CBOR } from "@pagopa/io-react-native-cbor";
import { b64utob64 } from "jsrsasign";

/**
 * The purpose for the credential request by the RP.
 */
type CredentialPurpose = {
  required: boolean;
  description?: string;
};

export type EvaluateDcqlQuery = (
  query: DcqlQuery.Input,
  credentialsSdJwt: [
    string /* type */,
    string /* keyTag */,
    string /* credential */,
  ][],
  credentialsMdoc: [
    string /* type */,
    string /* keyTag */,
    string /* credential */,
  ][]
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

/**
 * Convert a credential in SD-JWT format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialSdJwtToObj = (credentials: [string, string, string][]) =>
  credentials.map(([, , jwt]) => {
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
    } as DcqlCredential;
  });

/**
 * Convert a credential in Mdoc format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialsMdocToObj = async (
  credentialsMdoc: [string, string, string][]
) => {
  return await Promise.all(
    credentialsMdoc?.map(async ([type, _, credential]) => {
      const issuerSigned = credential
        ? await CBOR.decodeIssuerSigned(b64utob64(credential))
        : undefined;
      if (!issuerSigned) {
        throw new CredentialNotFoundError(
          "mso_mdoc credential is not present."
        );
      }

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
        credential_format: "mso_mdoc",
        doctype: type,
        namespaces,
      } as DcqlCredential;
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

export const evaluateDcqlQuery: EvaluateDcqlQuery = async (
  query,
  credentialsSdJwt,
  credentialsMdoc
) => {
  const credentials = [] as DcqlCredential[];
  credentials.push(...mapCredentialSdJwtToObj(credentialsSdJwt));
  credentials.push(...(await mapCredentialsMdocToObj(credentialsMdoc)));

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
    // Build an object doctype:credentialMdoc to map matched credentials to their JWT
    const credentialsMdocByDoctype = credentials.reduce(
      (acc, c, i) => ({ ...acc, [c.doctype]: credentialsMdoc[i]! }),
      {} as Record<string, [string /* keyTag */, string /* credential */]>
    );

    return getDcqlQueryMatches(queryResult).map(([id, match]) => {
      const purposes = queryResult.credential_sets
        ?.filter((set) => set.matching_options?.flat().includes(id))
        ?.map<CredentialPurpose>((credentialSet) => ({
          description: credentialSet.purpose?.toString(),
          required: Boolean(credentialSet.required),
        }));

      if (
        match.output.credential_format === "vc+sd-jwt" ||
        match.output.credential_format === "dc+sd-jwt"
      ) {
        const { vct, claims } = match.output;

        const [, keyTag, credential] = credentialsSdJwtByVct[vct]!;

        const requiredDisclosures = Object.values(claims).map((item) => {
          const [_, name, value] = item as [string, string, string]
          return {
            name,
            value,
          };
        }) as EvaluatedDisclosure[];

        return {
          id,
          vct,
          keyTag,
          format: match.output.credential_format,
          credential,
          requiredDisclosures,
          // When it is a match but no credential_sets are found, the credential is required by default
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html#section-6.3.1.2-2.1
          purposes: purposes ?? [{ required: true }],
        };
      }

      if (match.output.credential_format === "mso_mdoc") {
        const { doctype, namespaces } = match.output;

        const [, keyTag, credential] = credentialsMdocByDoctype[doctype]!;
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
          // See https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html#section-6.3.1.2-2.1
          purposes: purposes ?? [{ required: true }],
          doctype,
        };
      }

      throw new Error(
        `Unsupported credential format: ${match.output.credential_format}`
      );
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
      // TODO [SIW-2110]: handle invalid DQCL query or let the error propagate
    }
    if (error instanceof DcqlCredentialSetError) {
      // TODO [SIW-2110]: handle missing credentials or let the error propagate
    }
    throw error;
  }
};
