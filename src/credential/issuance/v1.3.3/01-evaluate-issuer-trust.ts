import { UnimplementedFeatureError } from "../../../utils/errors";
import type { IssuanceApi } from "../api";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] =
  async () => {
    // TODO: [SIW-3909] Fetch Issuer configuration from IO Wallet SDK
    throw new UnimplementedFeatureError("evaluateIssuerTrust", "1.3.3");
  };
