import { CredentialIssuerEntityConfiguration } from "../../trust/v1.0.0/types";
import type { StartFlow } from "./01-start-flow";
import type { Out } from "../../utils/misc";
import { getCredentialIssuerEntityConfiguration } from "../../trust/v1.0.0/entities";

export type EvaluateIssuerTrust = (
  issuerUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  issuerConf: CredentialIssuerEntityConfiguration["payload"]["metadata"];
}>;

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * The Issuer trust evaluation phase.
 * Fetch the Issuer's configuration and verify trust.
 *
 * @param issuerUrl The base url of the Issuer returned by {@link startFlow}
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
 */
export const evaluateIssuerTrust: EvaluateIssuerTrust = async (
  issuerUrl,
  context = {}
) => {
  const issuerConf = await getCredentialIssuerEntityConfiguration(issuerUrl, {
    appFetch: context.appFetch,
  }).then(({ payload }) => payload.metadata);

  return { issuerConf };
};
