import type { TrustAnchorConfig } from "./TrustAnchorConfig";

export interface TrustBuildApi {
  /**
   * Build a not-verified trust chain for a given Relying Party (RP) entity.
   *
   * @param relyingPartyEntityBaseUrl The base URL of the RP entity
   * @param trustAnchorConfig The entity configuration of the known trust anchor.
   * @param appFetch An optional instance of the http client to be used.
   * @returns A list of signed tokens that represent the trust chain, in the order of the chain (from the RP to the Trust Anchor)
   * @throws {FederationError} When an element of the chain fails to parse or other build steps fail.
   */
  buildTrustChain(
    relyingPartyEntityBaseUrl: string,
    trustAnchorConfig: TrustAnchorConfig,
    appFetch: GlobalFetch["fetch"]
  ): Promise<string[]>;
}
