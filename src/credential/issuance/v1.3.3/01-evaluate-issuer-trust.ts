import { fetchMetadata } from "@pagopa/io-wallet-oid4vci";
import { partialCallbacks } from "../../../utils/callbacks";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerMetadata = await fetchMetadata({
    credentialIssuerUrl: issuerUrl,
    callbacks: {
      ...partialCallbacks,
      fetch: context.appFetch,
    },
  });

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
