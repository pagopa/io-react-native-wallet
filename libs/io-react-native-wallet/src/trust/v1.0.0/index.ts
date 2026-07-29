import type { TrustApi } from "../api";

import { withMapperAsync } from "../../utils/mappers";
import { buildTrustChain } from "./build-chain";
import { getTrustAnchorEntityConfiguration } from "./entities";
import { mapToTrustAnchorConfig } from "./mappers";
import { verifyTrustChain } from "./verify-chain";

export const Trust: TrustApi = {
  buildTrustChain,
  getTrustAnchorEntityConfiguration: withMapperAsync(
    mapToTrustAnchorConfig,
    getTrustAnchorEntityConfiguration,
  ),
  verifyTrustChain,
};
