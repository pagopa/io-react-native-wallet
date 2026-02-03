import { RelyingPartyEntityConfiguration } from "../../trust/v1.0.0/types"; // TODO: [SIW-3742] refactor presentation
import type { Out } from "../../../utils/misc";
import { getRelyingPartyEntityConfiguration } from "../../trust/v1.0.0/entities"; // TODO: [SIW-3742] refactor presentation

export type EvaluateRelyingPartyTrust = (
  rpUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
  subject: string;
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
    payload: { metadata: rpConf, sub },
  } = await getRelyingPartyEntityConfiguration(rpUrl, {
    appFetch,
  });
  return { rpConf, subject: sub };
};
