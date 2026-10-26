import type { WRPRCPayload } from "@pagopa/io-wallet-eudi-trust";

import { DcqlQuery } from "dcql";

import type { RequestObject } from "./types";

/** A credential or a claim requested by the Verifier and not registered in its WRPRC */
export interface UnregisteredRequest {
  /** Id of the DCQL Credential Query */
  credentialQueryId: string;
  format: string;
  /** The claim path, when the credential type is registered but the claim is not */
  path?: ClaimPath;
  /** The requested `vct` or `doctype`, when the query specifies one */
  type?: string;
}

type ClaimPath = (null | number | string)[];

const isSamePath = (a: ClaimPath, b: ClaimPath) =>
  a.length === b.length && a.every((element, index) => element === b[index]);

/**
 * Compares the credentials and claims requested in the DCQL query with the scope registered
 * in the `credentials` of the Verifier WRPRC (ETSI TS 119 475 Table 9), as per the IT-Wallet
 * Scope Comparison during Credential Presentation.
 *
 * Every Credential Query is checked, including the alternatives of `credential_sets`, and every
 * `vct` of a query must be registered. Credentials match on their exact format and type, claims
 * on their exact path. A registered credential without `claim` registers none of its claims.
 * The registered `values` are not checked.
 *
 * @returns The unregistered credentials and claims: when any, the Verifier is overasking.
 * @throws If the DCQL query is malformed
 */
export const findUnregisteredRequests = (
  dcqlQuery: RequestObject["dcql_query"],
  wrprc: WRPRCPayload,
): UnregisteredRequest[] =>
  DcqlQuery.parse(dcqlQuery as DcqlQuery.Input).credentials.flatMap((query) => {
    const { format, id } = query;
    const types =
      query.format === "mso_mdoc"
        ? [query.meta?.doctype_value].filter((type) => type !== undefined)
        : query.format === "dc+sd-jwt"
          ? (query.meta?.vct_values ?? [])
          : [];

    if (types.length === 0) {
      return [{ credentialQueryId: id, format }];
    }

    const paths: ClaimPath[] = (query.claims ?? []).map((claim) =>
      "path" in claim ? claim.path : [claim.namespace, claim.claim_name],
    );

    return types.flatMap((type): UnregisteredRequest[] => {
      const registered = (wrprc.credentials ?? []).filter(
        (credential) =>
          credential.format === format &&
          (format === "mso_mdoc"
            ? credential.meta.doctype_value === type
            : Array.isArray(credential.meta.vct_values) &&
              credential.meta.vct_values.includes(type)),
      );

      if (registered.length === 0) {
        return [{ credentialQueryId: id, format, type }];
      }

      const registeredPaths = registered.flatMap(({ claim = [] }) =>
        claim.map(({ path }) => path),
      );

      return paths
        .filter(
          (path) =>
            !registeredPaths.some((registeredPath) =>
              isSamePath(registeredPath, path),
            ),
        )
        .map((path) => ({ credentialQueryId: id, format, path, type }));
    });
  });
