import type { CertificateValidationResult } from "@pagopa/io-react-native-crypto";

export interface VerifyAuthRequestCertificateChainApi {
  /**
   * Verify the X.509 certificate chain in the Request Object `x5c` header claim.
   * @since 1.0.0
   *
   * @param requestObjectJwt The Request Object in JWT format
   * @param params.caRootCerts The CA root certificate used to validate the chain
   * @returns The certificate validation result
   * @throws {MissingX509CertsError} if the Request Object does not contain x5c
   * @throws {X509ValidationError} if the certificate chain validation fails
   */
  verifyAuthRequestCertificateChain(
    requestObjectJwt: string,
    params: {
      caRootCerts: string;
    }
  ): Promise<CertificateValidationResult>;
}
