import { createMapper } from "../../utils/mappers";
import { TrustAnchorEntityConfiguration } from "./types";
import type { TrustAnchorConfig } from "../api/TrustAnchorConfig";

export const mapToTrustAnchorConfig = createMapper<
  TrustAnchorEntityConfiguration,
  TrustAnchorConfig
>((x) => {
  const { federation_entity } = x.payload.metadata;
  return {
    header: x.header,
    payload: {
      keys: x.payload.jwks.keys,
      federation_fetch_endpoint: federation_entity.federation_fetch_endpoint!,
      federation_list_endpoint: federation_entity.federation_list_endpoint!,
      federation_resolve_endpoint:
        federation_entity.federation_resolve_endpoint!,
    },
  };
});
