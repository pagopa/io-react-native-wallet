import {
  fetchMetadata,
  type MetadataResponseV1_3,
} from "@pagopa/io-wallet-oid4vci";
import { partialCallbacks } from "../../../utils/callbacks";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";
import { sdkConfigV1_3 } from "src/utils/config";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerMetadata = (await fetchMetadata({
    config: sdkConfigV1_3,
    credentialIssuerUrl: issuerUrl,
    callbacks: {
      ...partialCallbacks,
      fetch: context.appFetch,
    },
  })) as MetadataResponseV1_3;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
