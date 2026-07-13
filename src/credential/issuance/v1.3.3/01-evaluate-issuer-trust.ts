import {
  fetchMetadata,
  type MetadataResponseV1_3,
} from "@pagopa/io-wallet-oid4vci";

import type { IssuanceApi } from "../api";

import { sdkConfigV1_3 } from "../../../utils/config";
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
    config: sdkConfigV1_3,
    credentialIssuerUrl: issuerUrl,
  })) as MetadataResponseV1_3;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
