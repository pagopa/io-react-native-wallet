import type { RelyingPartyConfig } from "../api/RelyingPartyConfig";
import type { RequestObject } from "../api/types";

import { RelyingPartyEntityConfiguration } from "../../../trust/v1.4.4/types";
import { createMapper } from "../../../utils/mappers";
import { RawRequestObject } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>(({ payload }) => {
  const { federation_entity, openid_credential_verifier } = payload.metadata;

  return {
    encrypted_response_enc_values_supported:
      openid_credential_verifier.encrypted_response_enc_values_supported,
    federation_entity,
    jwks: openid_credential_verifier.jwks,
    subject: payload.sub,
  };
});

export const mapToRequestObject = createMapper<RawRequestObject, RequestObject>(
  ({ header, payload }) => ({
    client_id: payload.client_id,
    client_metadata: payload.client_metadata,
    dcql_query: payload.dcql_query,
    iss: payload.iss ?? "",
    nonce: payload.nonce,
    response_mode: payload.response_mode,
    response_type: payload.response_type,
    response_uri: payload.response_uri,
    state: payload.state,
    trust_chain: header.trust_chain,
    x5c: header.x5c,
  }),
);
