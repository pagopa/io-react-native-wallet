import { createMapper } from "../../../utils/mappers";
import { RelyingPartyEntityConfiguration } from "../../../trust/v1.0.0/types";
import type { RelyingPartyConfig } from "../api";
import type { RequestObject } from "../api/types";
import { RawRequestObject } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>(({ payload }) => {
  const { federation_entity, openid_credential_verifier } = payload.metadata;
  return {
    subject: payload.sub,
    jwks: openid_credential_verifier.jwks,
    authorization_encrypted_response_alg:
      openid_credential_verifier.authorization_encrypted_response_alg,
    authorization_encrypted_response_enc:
      openid_credential_verifier.authorization_encrypted_response_enc,
    federation_entity,
  };
});

export const mapToRequestObject = createMapper<RawRequestObject, RequestObject>(
  ({ header, payload }) => ({
    iss: payload.iss,
    client_id: payload.client_id,
    dcql_query: payload.dcql_query,
    nonce: payload.nonce,
    response_uri: payload.response_uri,
    state: payload.state,
    response_mode: payload.response_mode,
    response_type: payload.response_type,
    trust_chain: header.trust_chain,
  })
);
