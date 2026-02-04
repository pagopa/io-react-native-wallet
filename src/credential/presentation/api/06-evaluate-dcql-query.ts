import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { DcqlQuery } from "dcql";

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

export interface EvaluateDcqlQueryApi {
  /**
   * Evaluate a list of credentials against a DCQL query. The function returns details
   * on the credential(s) that satisfied the query, with useful metadata to ask the user's consent.
   * @since 1.0.0
   *
   * @param credentialsSdJwt The list of SD-JWT credentials
   * @param query The DCQL query
   * @returns The list of credentials that satisfied the query, with the requested claims
   */
  evaluateDcqlQuery(
    credentialsSdJwt: [CryptoContext, string /* credential */][],
    query: DcqlQuery.Input
  ): {
    id: string;
    vct: string;
    credential: string;
    cryptoContext: CryptoContext;
    requiredDisclosures: Disclosure[];
    purposes: CredentialPurpose[];
  }[];
}
