import type { TrustAnchorConfig } from "../api/TrustAnchorConfig";

import { createMapper } from "../../utils/mappers";
import { TrustAnchorEntityConfiguration } from "./types";

export const mapToTrustAnchorConfig = createMapper<
  TrustAnchorEntityConfiguration,
  TrustAnchorConfig
>((x) => {
  const { federation_entity } = x.payload.metadata;
  return {
    federation_entity,
    jwt: { header: x.header },
    keys: x.payload.jwks.keys,
  };
});
