import type { RelyingPartyConfig } from "./RelyingPartyConfig";

export interface EvaluateRelyingPartyTrustApi {
  /**
   * The Relying Party trust evaluation phase.
   * Fetch the Relying Party's configuration and verify trust.
   * @since 1.0.0
   *
   * @param rpUrl The base url of the Relying Party
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns The Relying Party's configuration
   */
  evaluateRelyingPartyTrust(
    rpUrl: string,
    ctx?: { appFetch?: GlobalFetch["fetch"] }
  ): Promise<{ rpConf: RelyingPartyConfig }>;
}
