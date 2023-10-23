import { getRelyingPartyEntityConfiguration } from "../../trust";
import { RelyingPartyEntityConfiguration } from "../../trust/types";
import type { StartFlow } from "../issuing/01-start-flow";
import type { Out } from "../../utils/misc";

export type EvaluateRelyingPartyTrust = (
  rpUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
}>;

/**
 * The Relying Party trust evaluation phase.
 * Fetch the  Relying Party's configuration and verify trust.
 *
 * @param rpUrl The base url of the Issuer
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Relying Party's configuration
 */
export const evaluateRelyingPartyTrust: EvaluateRelyingPartyTrust = async (
  rpUrl,
  { appFetch = fetch } = {}
) => {
  const {
    payload: { metadata: rpConf },
  } = await getRelyingPartyEntityConfiguration(rpUrl, {
    appFetch,
  });
  return { rpConf };
};
