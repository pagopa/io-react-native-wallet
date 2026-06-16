import type { IssuerConfig } from "./IssuerConfig";

export interface EvaluateIssuerTrustApi {
  /**
   * The Issuer trust evaluation phase.
   * Fetch the Issuer's configuration and verify trust.
   * @since 1.0.0
   *
   * @param issuerUrl The base url of the Issuer
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @param context.authorizationServer (optional) Authorization Server URL selected
   *   from a credential offer. When provided it must match one of the Credential
   *   Issuer metadata `authorization_servers`. Only honored from v1.3.3 onwards.
   * @returns The Issuer's configuration
   */
  evaluateIssuerTrust(
    issuerUrl: string,
    ctx?: { appFetch?: GlobalFetch["fetch"]; authorizationServer?: string }
  ): Promise<{ issuerConf: IssuerConfig }>;
}
