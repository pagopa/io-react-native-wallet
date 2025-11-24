import { CBOR } from "@pagopa/io-react-native-iso18013";
import { b64utob64 } from "jsrsasign";
import type { DcqlMdocCredential, DcqlQueryResult } from "dcql";
import type { EvaluatedDisclosure, PresentationFrame } from "./types";
import { getValidDcqlClaims, type Credential4Dcql } from "./utils";

type CustomDcqlMdocCredential = DcqlMdocCredential & {
  original_credential: Credential4Dcql;
};

/**
 * Convert a list of credential in mdoc format to a list of objects
 * with namespaces for correct parsing by the `dcql` library.
 * @param credentials The raw mdoc credentials
 * @returns List of `dcql` compatible objects
 */
export const mapCredentialsToObj = async (
  credentialsMdoc: Credential4Dcql[]
): Promise<CustomDcqlMdocCredential[]> => {
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
        {} as DcqlMdocCredential["namespaces"]
      );
      console.log(issuerSigned);
      return {
        credential_format: "mso_mdoc",
        doctype: issuerSigned.issuerAuth.payload.docType || "missing_doctype",
        cryptographic_holder_binding: true,
        namespaces,
        original_credential: credential,
      } satisfies CustomDcqlMdocCredential;
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
  getValidDcqlClaims(match).flatMap(({ output }) =>
    Object.entries(output).flatMap(([ns, nsClaims]) =>
      Object.keys(nsClaims).map((claimName) => ({
        namespace: ns,
        name: claimName,
        value: nsClaims[claimName],
      }))
    )
  );

/**
 * Build a presentation frame from the requested claims for selective disclosure.
 * @param requestedClaims Claims in {@link EvaluatedDisclosure} format
 * @param docType mdoc doctype
 * @returns A presentation frame for ISO18013
 * @example { "org.iso.18013.5.1.mDL": { "org.iso.18013.5.1": { first_name: true } } }
 */
export const getPresentationFrameFromClaims = (
  requestedClaims: EvaluatedDisclosure[],
  docType: string
): PresentationFrame => ({
  [docType]: requestedClaims.reduce((acc, { name, namespace }) => {
    if (namespace) {
      acc[namespace] ??= {};
      const existingNamespace = acc[namespace] as Record<string, boolean>;
      existingNamespace[name] = true;
    } else {
      acc[name] = true;
    }
    return acc;
  }, {} as PresentationFrame),
});
