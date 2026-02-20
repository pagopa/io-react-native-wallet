import type { DcqlQuery } from "dcql";
import type {
  Credential4Dcql,
  CredentialFormat,
  PresentationFrame,
} from "./types";

/**
 * The purpose for the credential request by the RP.
 */
export type CredentialPurpose = {
  required: boolean;
  description?: string;
};

export type Disclosure = [
  string /* salt */,
  string /* claim name */,
  unknown /* claim value */,
];

export type EvaluatedDisclosure = {
  namespace?: string;
  name: string;
  value: unknown;
};

export interface EvaluateDcqlQueryApi {
  /**
   * Evaluate a list of credentials against a DCQL query. The function returns details
   * on the credential(s) that satisfied the query, with useful metadata to ask the user's consent.
   * @since 1.0.0
   *
   * @param query The DCQL query
   * @param credentialsSdJwt The list of SD-JWT credentials
   * @param credentialsMdoc The list of mdoc credentials
   * @returns The list of credentials that satisfied the query, with the requested claims
   * @throws {DcqlError} if the provided DCQL query is not valid
   */
  evaluateDcqlQuery(
    query: DcqlQuery.Input,
    credentialsSdJwt: Credential4Dcql[],
    credentialsMdoc?: Credential4Dcql[]
  ): Promise<
    ({
      id: string;
      credential: string;
      keyTag: string;
      requiredDisclosures: EvaluatedDisclosure[];
      presentationFrame: PresentationFrame;
      purposes: CredentialPurpose[];
    } & CredentialFormat)[]
  >;
}
