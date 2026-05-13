import {
  verifyCertificateChain,
  type CertificateValidationResult,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import { X509ValidationError } from "../trust/common/errors";

/**
 * This function checks whether the x509 certificate chain is valid against a specified Certificate Authority (CA)
 *
 * @param x5chain The mdoc's x509 certificate chain
 * @param x509CertRoot The Trust Anchor CA
 * @param options Options for certificate validation
 */
export const verifyX509Chain = async (
  x5chain: string[],
  x509CertRoot: string,
  options: X509CertificateOptions = {
    connectTimeout: 10000,
    readTimeout: 10000,
    requireCrl: true,
  }
) => {
  const x509ValidationResult: CertificateValidationResult =
    await verifyCertificateChain(x5chain, x509CertRoot, options);

  if (!x509ValidationResult.isValid) {
    throw new X509ValidationError(
      `X.509 certificate chain validation failed. Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
      {
        x509ValidationStatus: x509ValidationResult.validationStatus,
        x509ErrorMessage: x509ValidationResult.errorMessage,
      }
    );
  }
};
