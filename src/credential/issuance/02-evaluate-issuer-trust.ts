import { getCredentialIssuerEntityConfiguration } from "../../trust";
import { CredentialIssuerEntityConfiguration } from "../../trust/types";
import type { StartFlow } from "./01-start-flow";
import type { Out } from "../../utils/misc";

export type EvaluateIssuerTrust = (
  issuerUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  issuerConf: CredentialIssuerEntityConfiguration["payload"]["metadata"];
}>;

/**
 * The Issuer trust evaluation phase.
 * Fetch the Issuer's configuration and verify trust.
 *
 * @param issuerUrl The base url of the Issuer
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
 */
export const evaluateIssuerTrust: EvaluateIssuerTrust = async (
  issuerUrl,
  context = {}
) => {
  const issuerConf = await getCredentialIssuerEntityConfiguration(issuerUrl, {
    appFetch: context.appFetch,
  }).then((_) => _.payload.metadata);
  return { issuerConf };
};
