import type { RelyingPartyConfig } from "../api";
import type { RequestObject } from "../api/types";

import { RelyingPartyEntityConfiguration } from "../../../trust/v1.0.0/types";
import { createMapper } from "../../../utils/mappers";
import { RawRequestObject } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>(({ payload }) => {
  const { federation_entity, openid_credential_verifier } = payload.metadata;
  return {
    authorization_encrypted_response_alg:
      openid_credential_verifier.authorization_encrypted_response_alg,
    authorization_encrypted_response_enc:
      openid_credential_verifier.authorization_encrypted_response_enc,
    federation_entity,
    jwks: openid_credential_verifier.jwks,
    subject: payload.sub,
  };
});

export const mapToRequestObject = createMapper<RawRequestObject, RequestObject>(
  ({ header, payload }) => ({
    client_id: payload.client_id,
    dcql_query: payload.dcql_query,
    iss: payload.iss,
    nonce: payload.nonce,
    response_mode: payload.response_mode,
    response_type: payload.response_type,
    response_uri: payload.response_uri,
    state: payload.state,
    trust_chain: header.trust_chain,
  }),
);
