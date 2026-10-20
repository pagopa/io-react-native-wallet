import type { CborDecoder } from "../../../mdoc/types";
import type { Signer } from "../../../utils/crypto";
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
   * @param credentials.credentialsSdJwt The list of SD-JWT credentials
   * @param credentials.credentialsMdoc The mdoc credentials, with the CBOR decoder needed to parse them
   * @returns Credentials that satisfy the query, with disclosure metadata.
   * @throws {DcqlError} if the provided DCQL query is not valid
   */
  evaluateDcqlQuery(
    query: DcqlQuery,
    credentials: EvaluateDcqlQueryCredentials,
  ): Promise<EvaluatedCredential[]>;
}

/**
 * The credentials to evaluate against a DCQL query. At least one of SD-JWT and mdoc credentials is required.
 */
export type EvaluateDcqlQueryCredentials =
  | {
      credentialsMdoc: EvaluateDcqlQueryMdocCredentials;
      credentialsSdJwt?: Credential4Dcql[];
    }
  | {
      credentialsMdoc?: EvaluateDcqlQueryMdocCredentials;
      credentialsSdJwt: Credential4Dcql[];
    };

/**
 * mdoc credentials to evaluate against a DCQL query, with the CBOR decoder needed to parse them.
 */
export interface EvaluateDcqlQueryMdocCredentials {
  /** The CBOR decoder provided by the consumer */
  cborDecoder: CborDecoder;
  /** The list of mdoc credentials */
  credentials: Credential4Dcql[];
}

export type EvaluatedCredential = CredentialFormat & {
  credential: string;
  id: string;
  presentationFrame: PresentationFrame;
  purposes: CredentialPurpose[];
  requiredDisclosures: EvaluatedDisclosure[];
  signer: Signer;
};

export interface EvaluatedDisclosure {
  name: string;
  namespace?: string;
  value: unknown;
}
