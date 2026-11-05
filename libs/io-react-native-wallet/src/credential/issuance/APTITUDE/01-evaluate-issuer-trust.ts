import {
  fetchMetadata,
  type MetadataResponseAPTITUDE,
} from "@pagopa/io-wallet-oid4vci";

import type { IssuanceApi } from "../api";

import { sdkConfigAPTITUDE } from "../../../utils/config";
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
    config: sdkConfigAPTITUDE,
    credentialIssuerUrl: issuerUrl,
  })) as MetadataResponseAPTITUDE;

  return { issuerConf: mapToIssuerConfig(issuerMetadata) };
};
