import type { TrustApi } from "../api";
import { getTrustAnchorEntityConfiguration } from "./entities";
import { mapToTrustAnchorConfig } from "./mappers";
import { buildTrustChain } from "./build-chain";
import { verifyTrustChain } from "./verify-chain";
import { withMapperAsync } from "src/utils/mappers";

export const Trust: TrustApi = {
  getTrustAnchorEntityConfiguration: withMapperAsync(
    mapToTrustAnchorConfig,
    getTrustAnchorEntityConfiguration
  ),
  buildTrustChain,
  verifyTrustChain,
};
