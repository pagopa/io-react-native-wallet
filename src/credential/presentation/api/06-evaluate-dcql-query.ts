import type {
  Credential4Dcql,
  CredentialFormat,
  DcqlQuery,
  PresentationFrame,
} from "./types";

/**
 * The purpose for the credential request by the RP.
 */
export interface CredentialPurpose {
  description?: string;
  required: boolean;
}

export type Disclosure = [
  string /* salt */,
  string /* claim name */,
  unknown /* claim value */,
];

export interface EvaluateDcqlQueryApi {
  /**
   * Evaluate a list of credentials against a DCQL query. The function returns details
   * on the credential(s) that satisfied the query, with useful metadata to ask the user's consent.
   * @since 1.0.0
   *
   * @param query The DCQL query
   * @param credentialsSdJwt The list of SD-JWT credentials
   * @param credentialsMdoc The list of mdoc credentials
   * @returns Credentials that satisfy the query, with disclosure metadata.
   * @throws {DcqlError} if the provided DCQL query is not valid
   */
  evaluateDcqlQuery(
    query: DcqlQuery,
    credentialsSdJwt: Credential4Dcql[],
    credentialsMdoc?: Credential4Dcql[],
  ): Promise<
    (CredentialFormat & {
      credential: string;
      id: string;
      keyTag: string;
      presentationFrame: PresentationFrame;
      purposes: CredentialPurpose[];
      requiredDisclosures: EvaluatedDisclosure[];
    })[]
  >;
}

export interface EvaluatedDisclosure {
  name: string;
  namespace?: string;
  value: unknown;
}
