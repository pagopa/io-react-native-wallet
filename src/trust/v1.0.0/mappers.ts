import { createMapper } from "../../utils/mappers";
import { TrustAnchorEntityConfiguration } from "./types";
import type { TrustAnchorConfig } from "../api/TrustAnchorConfig";

export const mapToTrustAnchorConfig = createMapper<
  TrustAnchorEntityConfiguration,
  TrustAnchorConfig
>((x) => {
  const { federation_entity } = x.payload.metadata;
  return {
    jwt: { header: x.header },
    keys: x.payload.jwks.keys,
    federation_entity,
  };
});
