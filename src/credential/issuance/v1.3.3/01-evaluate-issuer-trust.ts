import {
  fetchMetadata,
  type MetadataResponseV1_3,
} from "@pagopa/io-wallet-oid4vci";
import { sdkConfigV1_3 } from "../../../utils/config";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerMetadata = (await fetchMetadata({
    config: sdkConfigV1_3,
    credentialIssuerUrl: issuerUrl,
    callbacks: {
      fetch: context.appFetch,
    },
  })) as MetadataResponseV1_3;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
