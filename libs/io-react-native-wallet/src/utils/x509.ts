import { X509ValidationError } from "../trust/common/errors";

/**
 * Validates an X.509 certificate chain against a Certificate Authority (CA), provided by the consumer.
 * The trust anchor is not included in the chain, it is supplied separately.
 *
 * @param chain The base64-encoded DER certificate chain, leaf first, trust anchor excluded
 * @param caRootCert The base64-encoded DER Trust Anchor CA
 * @param options Options for certificate validation
 * @returns The validation result
 */
export type CertificateChainVerifier = (
  chain: string[],
  caRootCert: string,
  options: X509CertificateOptions,
) => Promise<CertificateValidationResult>;

/**
 * The result of an X.509 certificate chain validation
 */
export interface CertificateValidationResult {
  /** Error message in case validation failed */
  errorMessage: string;
  /** Whether the certificate chain is valid */
  isValid: boolean;
  /** The implementation-specific validation status, e.g. a code describing the failure reason */
  validationStatus: string;
}

/**
 * Options for X.509 certificate validation
 */
export interface X509CertificateOptions {
  connectTimeout: number;
  readTimeout: number;
  requireCrl: boolean;
}

/**
 * This function checks whether the x509 certificate chain is valid against a specified Certificate Authority (CA)
 *
 * @param x5chain The mdoc's x509 certificate chain
 * @param x509CertRoot The Trust Anchor CA
 * @param certificateChainVerifier The certificate chain validator provided by the consumer
 * @param options Options for certificate validation
 */
export const verifyX509Chain = async (
  x5chain: string[],
  x509CertRoot: string,
  certificateChainVerifier: CertificateChainVerifier,
  options: X509CertificateOptions = {
    connectTimeout: 10000,
    readTimeout: 10000,
    requireCrl: true,
  },
) => {
  // Strip the trust anchor from the chain if the issuer included it,
  // since certificateChainVerifier expects it passed separately.
  const certChain =
    x5chain.length > 1 && x5chain.at(-1) === x509CertRoot
      ? x5chain.slice(0, -1)
      : x5chain;

  const x509ValidationResult = await certificateChainVerifier(
    certChain,
    x509CertRoot,
    options,
  );

  if (!x509ValidationResult.isValid) {
    throw new X509ValidationError(
      `X.509 certificate chain validation failed. Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
      {
        x509ErrorMessage: x509ValidationResult.errorMessage,
        x509ValidationStatus: x509ValidationResult.validationStatus,
      },
    );
  }
};
