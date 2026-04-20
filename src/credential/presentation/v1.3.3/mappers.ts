import { RelyingPartyEntityConfiguration } from "../../../trust/v1.3.3/types";
import { createMapper } from "../../../utils/mappers";
import type { RelyingPartyConfig } from "../api/RelyingPartyConfig";
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
    federation_entity,
    encrypted_response_enc_values_supported:
      openid_credential_verifier.encrypted_response_enc_values_supported,
  };
});

export const mapToRequestObject = createMapper<RawRequestObject, RequestObject>(
  ({ payload, header }) => ({
    iss: payload.iss,
    client_id: payload.client_id,
    dcql_query: payload.dcql_query,
    nonce: payload.nonce,
    response_uri: payload.response_uri,
    state: payload.state,
    response_mode: payload.response_mode,
    response_type: payload.response_type,
    client_metadata: payload.client_metadata,
    x5c: header.x5c,
    trust_chain: header.trust_chain,
  })
);
