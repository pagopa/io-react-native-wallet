import type { TrustApi } from "../api";
import { getTrustAnchorEntityConfiguration } from "./entities";
import { withMapperAsync } from "../../utils/mappers";
import { mapToTrustAnchorConfig } from "./mappers";
import { buildTrustChain } from "./build-chain";
import { verifyTrustChain } from "./verify-chain";

export const Trust: TrustApi = {
  getTrustAnchorEntityConfiguration: withMapperAsync(
    mapToTrustAnchorConfig,
    getTrustAnchorEntityConfiguration
  ),
  buildTrustChain,
  verifyTrustChain,
};
