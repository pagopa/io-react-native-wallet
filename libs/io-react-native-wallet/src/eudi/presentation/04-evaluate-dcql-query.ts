import { DcqlError, DcqlQuery } from "dcql";
import { isValiError, type ValiError } from "valibot";

import type { CredentialPurpose } from "../../credential/presentation/api/06-evaluate-dcql-query";
import type {
  Credential4Dcql,
  EvaluatedDisclosure,
  PresentationFrame,
} from "../../credential/presentation/api/types";
import type { RequestObject } from "./types";

import { CredentialsNotFoundError } from "../../credential/presentation/common/errors";
import {
  extractFailedCredentialsDetails,
  getClaimsFromDcqlMatch,
  getDcqlQueryMatches,
  getPresentationFrameFromDcqlMatch,
} from "../../credential/presentation/common/utils/dcql";
import * as mdocUtils from "../../credential/presentation/common/utils/mdoc";
import * as sdJwtUtils from "../../credential/presentation/common/utils/sd-jwt";

/** A wallet credential that satisfies a DCQL Credential Query, with the claims to disclose */
export type EvaluatedCredential = {
  /** The raw credential, as issued */
  credential: string;
  /** Id of the DCQL Credential Query the credential satisfies */
  id: string;
  /** Tag of the key the credential is bound to */
  keyTag: string;
  presentationFrame: PresentationFrame;
  requiredDisclosures: EvaluatedDisclosure[];
} & (
  | { doctype: string; format: "mso_mdoc" }
  | { format: "dc+sd-jwt"; vct: string }
);

/** A DCQL Credential Query of the request, with every wallet credential that satisfies it */
export interface EvaluatedCredentialQuery {
  /** The wallet credentials that satisfy the query: the user chooses the one to present */
  candidates: EvaluatedCredential[];
  /** Id of the DCQL Credential Query */
  id: string;
  /** The purposes of the request to show to the user */
  purposes: CredentialPurpose[];
}

export interface WalletCredential {
  /** The raw credential, as issued */
  credential: string;
  format: string;
  /** Tag of the key the credential is bound to */
  keyTag: string;
}

type DcqlMatch = ReturnType<typeof getDcqlQueryMatches>[number][1];

const SD_JWT_FORMATS = ["dc+sd-jwt", "vc+sd-jwt"];

const parseDcqlQuery = (query: RequestObject["dcql_query"]) => {
  try {
    const parsedQuery = DcqlQuery.parse(query as DcqlQuery.Input);
    DcqlQuery.validate(parsedQuery);
    return parsedQuery;
  } catch (error) {
    // Remapped for consistency, so that every invalid query throws a `DcqlError`
    if (isValiError(error)) {
      throw new DcqlError({
        cause: (error as ValiError<never>).issues,
        code: "PARSE_ERROR",
        message: "Failed to parse the provided DCQL query",
      });
    }
    throw error;
  }
};

/**
 * Evaluates the DCQL query of the Request Object (OpenID4VP 1.0, Section 6) against the
 * wallet credentials. Unlike the IT-Wallet evaluation, every credential that satisfies a
 * Credential Query is returned, e.g. two PIDs, so that the user chooses the one to present.
 *
 * @param requestObject - The verified Request Object
 * @param credentials - The wallet credentials, in any format: unsupported ones are ignored
 * @returns The satisfied Credential Queries, with their candidate credentials and the
 * purposes to show to the user before asking their consent
 * @throws {CredentialsNotFoundError} If the wallet credentials do not satisfy the query
 * @throws {DcqlError} If the DCQL query is not valid
 */
export const evaluateDcqlQuery = async (
  requestObject: RequestObject,
  credentials: WalletCredential[],
): Promise<EvaluatedCredentialQuery[]> => {
  const toCredential4Dcql = ({
    credential,
    keyTag,
  }: WalletCredential): Credential4Dcql => [keyTag, credential];

  const dcqlCredentials = (
    await Promise.all([
      sdJwtUtils.mapCredentialsToObj(
        credentials
          .filter(({ format }) => SD_JWT_FORMATS.includes(format))
          .map(toCredential4Dcql),
      ),
      mdocUtils.mapCredentialsToObj(
        credentials
          .filter(({ format }) => format === "mso_mdoc")
          .map(toCredential4Dcql),
      ),
    ])
  ).flat();

  const query = parseDcqlQuery(requestObject.dcql_query);
  const queryResult = DcqlQuery.query(query, dcqlCredentials);

  if (!queryResult.can_be_satisfied) {
    throw new CredentialsNotFoundError(
      extractFailedCredentialsDetails(queryResult),
    );
  }

  const toEvaluatedCredential = (
    id: string,
    match: DcqlMatch,
    validCredential: DcqlMatch["valid_credentials"][number],
  ): EvaluatedCredential => {
    // The shared helpers read the claims of the first valid credential of the match
    const credentialMatch: DcqlMatch = {
      ...match,
      valid_credentials: [validCredential],
    };
    const dcqlCredential =
      dcqlCredentials[validCredential.input_credential_index];
    if (!dcqlCredential) {
      throw new Error(
        `Credential at index ${validCredential.input_credential_index} not found in the provided credentials.`,
      );
    }
    const [keyTag, credential] = dcqlCredential.original_credential;
    const output = validCredential.meta.output;

    switch (output.credential_format) {
      case "dc+sd-jwt":
        return {
          credential,
          format: output.credential_format,
          id,
          keyTag,
          presentationFrame: getPresentationFrameFromDcqlMatch(
            credentialMatch,
            query,
          ),
          requiredDisclosures: getClaimsFromDcqlMatch(credentialMatch),
          vct: output.vct,
        };
      case "mso_mdoc": {
        const requiredDisclosures =
          mdocUtils.getClaimsFromDcqlMatch(credentialMatch);
        return {
          credential,
          doctype: output.doctype,
          format: output.credential_format,
          id,
          keyTag,
          presentationFrame: mdocUtils.getPresentationFrameFromClaims(
            requiredDisclosures,
            output.doctype,
          ),
          requiredDisclosures,
        };
      }
      default:
        throw new Error(
          `Unsupported credential format: ${output.credential_format}`,
        );
    }
  };

  return getDcqlQueryMatches(queryResult).map(([id, match]) => ({
    candidates: match.valid_credentials.map((validCredential) =>
      toEvaluatedCredential(id, match, validCredential),
    ),
    id,
    // Without credential_sets, the credential is required by default (Section 6.4.2)
    purposes: queryResult.credential_sets
      ?.filter((set) => set.matching_options?.flat().includes(id))
      .map<CredentialPurpose>((credentialSet) => ({
        description: credentialSet.purpose?.toString(),
        required: Boolean(credentialSet.required),
      })) ?? [{ required: true }],
  }));
};
