import { fetchMetadata } from "@pagopa/io-wallet-oid4vci";
import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerMetadata = await fetchMetadata({
    credentialIssuerUrl: issuerUrl,
    config: sdkConfigV1_3,
    callbacks: {
      ...partialCallbacks,
      fetch: context.appFetch,
    },
  });

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
