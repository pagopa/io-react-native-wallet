import type { IssuerConfig } from "./IssuerConfig";

export interface EvaluateIssuerTrustApi {
  /**
   * The Issuer trust evaluation phase.
   * Fetch the Issuer's configuration and verify trust.
   * @since 1.0.0
   *
   * @param issuerUrl The base url of the Issuer
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns The Issuer's configuration
   */
  evaluateIssuerTrust(
    issuerUrl: string,
    ctx?: { appFetch?: GlobalFetch["fetch"] }
  ): Promise<{ issuerConf: IssuerConfig }>;
}
