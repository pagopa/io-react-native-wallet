import { getCredentialIssuerEntityConfiguration } from "../../../trust/v1.0.0/entities";
import type { EvaluateIssuerTrustApi } from "../api/01-evaluate-issuer-trust";
import { mapToIssuerConfig } from "./mappers";

export const evaluateIssuerTrust: EvaluateIssuerTrustApi["evaluateIssuerTrust"] =
  async (issuerUrl, context = {}) => {
    const issuerConf = await getCredentialIssuerEntityConfiguration(issuerUrl, {
      appFetch: context.appFetch,
    });

    return { issuerConf: mapToIssuerConfig(issuerConf) };
  };
