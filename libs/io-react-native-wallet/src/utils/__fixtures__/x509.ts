import type { CertificateChainVerifier } from "../x509";

/**
 * A {@link CertificateChainVerifier} that always succeeds, without relying on any native module.
 */
export const createMockCertificateChainVerifier =
  (): jest.MockedFunction<CertificateChainVerifier> =>
    jest.fn<
      ReturnType<CertificateChainVerifier>,
      Parameters<CertificateChainVerifier>
    >(async () => ({
      errorMessage: "",
      isValid: true,
      validationStatus: "VALID",
    }));
