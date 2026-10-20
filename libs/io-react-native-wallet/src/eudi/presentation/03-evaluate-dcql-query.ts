import type {
  Credential4Dcql,
  DcqlQuery,
} from "../../credential/presentation/api/types";
import type { RequestObject } from "./types";

import { evaluateDcqlQuery as evaluateCredentialsDcqlQuery } from "../../credential/presentation/v1.4.6/06-evaluate-dcql-query";

export type EvaluatedCredential = Awaited<
  ReturnType<typeof evaluateCredentialsDcqlQuery>
>[number];

export interface WalletCredential {
  /** The raw credential, as issued */
  credential: string;
  format: string;
  /** Tag of the key the credential is bound to */
  keyTag: string;
}

const SD_JWT_FORMATS = ["dc+sd-jwt", "vc+sd-jwt"];

/**
 * Evaluates the DCQL query of the Request Object (OpenID4VP 1.0, Section 6) against the
 * wallet credentials. The DCQL evaluation is not profile specific, so it is shared with the
 * IT-Wallet presentation.
 *
 * @param requestObject - The verified Request Object
 * @param credentials - The wallet credentials, in any format: unsupported ones are ignored
 * @returns The credentials that satisfy the query, with the claims to disclose and the
 * purposes to show to the user before asking their consent
 * @throws {CredentialsNotFoundError} If the wallet credentials do not satisfy the query
 * @throws {DcqlError} If the DCQL query is not valid
 */
export const evaluateDcqlQuery = (
  requestObject: RequestObject,
  credentials: WalletCredential[],
) => {
  const toCredential4Dcql = ({
    credential,
    keyTag,
  }: WalletCredential): Credential4Dcql => [keyTag, credential];

  return evaluateCredentialsDcqlQuery(
    requestObject.dcql_query as DcqlQuery,
    credentials
      .filter(({ format }) => SD_JWT_FORMATS.includes(format))
      .map(toCredential4Dcql),
    credentials
      .filter(({ format }) => format === "mso_mdoc")
      .map(toCredential4Dcql),
  );
};
