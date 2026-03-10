import { RelyingPartyEntityConfiguration } from "../../../trust/v1.3.3/types";
import { createMapper } from "../../../utils/mappers";
import type { RelyingPartyConfig } from "../api/RelyingPartyConfig";
import type { RequestObject } from "../api/types";
import { RequestObjectPayload } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>((x) => {
  const { federation_entity, openid_credential_verifier } = x.payload.metadata;

  return {
    subject: x.payload.sub,
    jwks: openid_credential_verifier.jwks,
    federation_entity,
    encrypted_response_enc_values_supported:
      openid_credential_verifier.encrypted_response_enc_values_supported,
  };
});

export const mapToRequestObject = createMapper<
  RequestObjectPayload,
  RequestObject
>((x) => ({
  iss: x.iss,
  client_id: x.client_id,
  dcql_query: x.dcql_query,
  nonce: x.nonce,
  response_uri: x.response_uri,
  state: x.state,
  response_mode: x.response_mode,
  response_type: x.response_type,
}));
