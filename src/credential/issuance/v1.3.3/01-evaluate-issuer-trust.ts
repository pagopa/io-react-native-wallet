import {
  fetchMetadata,
  type MetadataResponseV1_4,
} from "@pagopa/io-wallet-oid4vci";
import { sdkConfigV1_4 } from "../../../utils/config";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerMetadata = (await fetchMetadata({
    config: sdkConfigV1_4,
    credentialIssuerUrl: issuerUrl,
    authorizationServer: context.authorizationServer,
    callbacks: {
      fetch: context.appFetch,
    },
  })) as MetadataResponseV1_4;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
