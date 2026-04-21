import type { CertificateValidationResult } from "@pagopa/io-react-native-crypto";

export interface VerifyAuthRequestCertificateChainApi {
  /**
   * Verify the X.509 certificate chain in the Request Object `x5c` header claim.
   *
   * **Note:** the method is optional and might not be present in the interface. Always check for its presence before calling it.
   * @example
   * if (RemotePresentation.verifyAuthRequestCertificateChain) {
   *   RemotePresentation.verifyAuthRequestCertificateChain(requestObjectJwt, { caRootCert })
   * }
   *
   * @since 1.3.3
   *
   * @param requestObjectJwt The Request Object in JWT format
   * @param params.caRootCert The CA root certificate used to validate the chain
   * @returns The certificate validation result
   * @throws {MissingX509CertsError} if the Request Object does not contain x5c
   * @throws {X509ValidationError} if the certificate chain validation fails
   */
  verifyAuthRequestCertificateChain?(
    requestObjectJwt: string,
    params: {
      caRootCert: string;
    }
  ): Promise<CertificateValidationResult>;
}
