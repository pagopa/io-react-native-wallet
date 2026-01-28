import { getCredentialIssuerEntityConfiguration } from "../../../trust/v1.0.0/ec";
import type { IssuanceApi } from "../api";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: IssuanceApi["evaluateIssuerTrust"] = async (
  issuerUrl,
  context = {}
) => {
  const issuerConf = await getCredentialIssuerEntityConfiguration(issuerUrl, {
    appFetch: context.appFetch,
  });

  return { issuerConf: mapToIssuerConfig(issuerConf) };
};
