import { RelyingPartyEntityConfiguration } from "../../../trust/v1.3.3/types";
import { createMapper } from "../../../utils/mappers";
import type { RelyingPartyConfig } from "../api/RelyingPartyConfig";
import type { RequestObjectV1_3 } from "../api/types";
import { RequestObjectPayload } from "./types";

export const mapToRelyingPartyConfig = createMapper<
  RelyingPartyEntityConfiguration,
  RelyingPartyConfig
>((x) => {
  const { federation_entity } = x.payload.metadata;
  return {
    organization_name: federation_entity.organization_name,
    logo_uri: federation_entity.logo_uri,
    policy_uri: federation_entity.policy_uri,
    homepage_uri: federation_entity.homepage_uri,
  };
});

export const mapToRequestObject = createMapper<
  RequestObjectPayload,
  RequestObjectV1_3
>((x) => ({
  iss: x.iss,
  client_id: x.client_id,
  dcql_query: x.dcql_query,
  nonce: x.nonce,
  response_uri: x.response_uri,
  state: x.state,
  response_mode: x.response_mode,
  response_type: x.response_type
}));
