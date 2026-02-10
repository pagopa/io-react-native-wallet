/**
 * Common type for a parsed Status Assertion
 */
export type ParsedStatusAssertion = {
  iss: string;
  iat: number;
  exp: number;
  credential_hash: string;
  credential_hash_alg: string;
  credential_status_type: string;
  credential_status_detail?: {
    state: string;
    description: string;
  };
};
