import {
  fetchMetadata,
  type MetadataResponseV1_4,
} from "@pagopa/io-wallet-oid4vci";

import type { IssuanceApi } from "../api";

import { sdkConfigV1_4 } from "../../../utils/config";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {},
) => {
  const issuerMetadata = (await fetchMetadata({
    authorizationServer: context.authorizationServer,
    callbacks: {
      fetch: context.appFetch,
    },
    config: sdkConfigV1_4,
    credentialIssuerUrl: issuerUrl,
  })) as MetadataResponseV1_4;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
