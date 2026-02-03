import { createMapper } from "../../../utils/mappers";
import { RelyingPartyEntityConfiguration } from "../../../trust/v1.0.0/types";
import type { RelyingPartyConfig } from "../api";
import type { RequestObject } from "../api/types";
import { RequestObjectPayload } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>((x) => {
  const { federation_entity, openid_credential_verifier } = x.payload.metadata;
  return {
    subject: x.payload.sub,
    keys: x.payload.jwks.keys,
    organization_name: federation_entity.organization_name,
    logo_uri: federation_entity.logo_uri,
    policy_uri: federation_entity.policy_uri,
    contacts: federation_entity.contacts,
    homepage_uri: federation_entity.homepage_uri,
    authorization_encrypted_response_alg:
      openid_credential_verifier.authorization_encrypted_response_alg,
    authorization_encrypted_response_enc:
      openid_credential_verifier.authorization_encrypted_response_enc,
  };
});

export const mapToRequestObject = createMapper<
  RequestObjectPayload,
  RequestObject
>((x) => ({
  clientId: x.client_id,
  dcqlQuery: x.dcql_query,
  nonce: x.nonce,
  responseUri: x.response_uri,
  state: x.state,
}));
