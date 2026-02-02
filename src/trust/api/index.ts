import { type X509CertificateOptions } from "@pagopa/io-react-native-crypto";
import type { TrustAnchorConfig } from "./TrustAnchorConfig";
import type { ParsedToken } from "../common/utils";

type FetchContext = { appFetch?: GlobalFetch["fetch"] };

export interface TrustApi {
  /**
   * Get the common Trust Anchor Configuration, which is uniform across versions.
   *
   * @param trustAnchorBaseUrl The Trust Anchor base URL
   * @returns The Trust Anchor Configuration object
   */
  getTrustAnchorEntityConfiguration(
    trustAnchorBaseUrl: string,
    ctx?: FetchContext
  ): Promise<TrustAnchorConfig>;

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

  /**
   * Verify a given trust chain is actually valid.
   * It can handle fast chain renewal, which means we try to fetch a fresh version of each statement.
   *
   * @param trustAnchorEntity The entity configuration of the known trust anchor
   * @param chain The chain of statements to be validated
   * @param x509Options Options for the verification process
   * @param appFetch (optional) fetch api implementation
   * @param renewOnFail Whether to attempt to renew the trust chain if the initial validation fails
   * @returns The result of the chain validation
   * @throws {FederationError} If the chain is not valid
   */
  verifyTrustChain(
    trustAnchorEntity: TrustAnchorConfig,
    chain: string[],
    x509Options?: X509CertificateOptions,
    ctx?: {
      appFetch?: GlobalFetch["fetch"];
      renewOnFail?: boolean;
    }
  ): Promise<ParsedToken[]>;
}

export { type TrustAnchorConfig };
