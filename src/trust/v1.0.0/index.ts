import type { TrustApi } from "../api";
import { getTrustAnchorEntityConfiguration } from "./ec";
import { mapToTrustAnchorConfig } from "./mappers";
import { buildTrustChain } from "./build-chain";
import { verifyTrustChain } from "./verify-chain";

export const Trust: TrustApi = {
  getTrustAnchorEntityConfiguration: (taBaseUrl) =>
    getTrustAnchorEntityConfiguration(taBaseUrl).then(mapToTrustAnchorConfig),
  buildTrustChain,
  verifyTrustChain,
};
