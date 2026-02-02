import type { TrustApi } from "../api";
import { getTrustAnchorEntityConfiguration } from "./entities";
import { mapToTrustAnchorConfig } from "./mappers";
import { buildTrustChain } from "./build-chain";
import { verifyTrustChain } from "./verify-chain";

export const Trust: TrustApi = {
  // TODO: use withMapperAsync where PR #306 is merged
  getTrustAnchorEntityConfiguration: (taBaseUrl) =>
    getTrustAnchorEntityConfiguration(taBaseUrl).then(mapToTrustAnchorConfig),
  buildTrustChain,
  verifyTrustChain,
};
