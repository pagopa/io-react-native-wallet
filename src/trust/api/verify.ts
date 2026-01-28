import { type X509CertificateOptions } from "@pagopa/io-react-native-crypto";
import type { TrustAnchorConfig } from "./TrustAnchorConfig";

export interface TrustVerifyApi {
  /**
   * Validates a provided trust chain against a known trust anchor, including X.509 certificate checks.
   *
   * @param trustAnchorEntity The entity configuration of the known trust anchor (for JWT validation).
   * @param chain The chain of statements to be validated.
   * @param x509Options Options for X.509 certificate validation.
   * @returns The list of parsed tokens representing the chain.
   * @throws {FederationError} If the chain is not valid (JWT or X.509). Specific errors like TrustChainEmptyError, X509ValidationError may be thrown.
   */
  validateTrustChain(
    trustAnchorEntity: TrustAnchorConfig,
    chain: string[],
    x509Options: X509CertificateOptions
  ): Promise<ParsedToken[]>;

  /**
   * Given a trust chain, obtain a new trust chain by fetching each element's fresh version
   *
   * @param chain The original chain
   * @param appFetch (optional) fetch api implementation
   * @returns A list of signed token that represent the trust chain, in the same order of the provided chain
   * @throws {FederationError} If the chain is not valid
   */
  renewTrustChain(
    chain: string[],
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
    x509Options: X509CertificateOptions,
    ctx?: {
      appFetch?: GlobalFetch["fetch"];
      renewOnFail?: boolean;
    }
  ): Promise<ReturnType<typeof validateTrustChain>>;
}
