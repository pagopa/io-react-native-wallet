import { decode } from "@pagopa/io-react-native-jwt";
import {
  verifyCertificateChain,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import { MissingX509CertsError, X509ValidationError } from "../../trust/errors";
import { Logger, LogLevel } from "../../utils/logging";

type VerifyCertificateChain = {
  caRootCerts: string[];
};

/**
 * Verify the X.509 certificate chain in the Request Object `x5c` header claim
 * @param requestObjectJwt The Request Object JWT
 * @param params.caRootCerts A list of CA root certificates to validate the chain
 * @throws MissingX509CertsError
 * @throws X509ValidationError
 */
export const verifyAuthRequestCertificateChain = async (
  requestObjectJwt: string,
  { caRootCerts }: VerifyCertificateChain
) => {
  const x509Options: X509CertificateOptions = {
    requireCrl: false,
    connectTimeout: 10_000,
    readTimeout: 10_000,
  };

  const requestObject = decode(requestObjectJwt);

  const certChain = requestObject.protectedHeader.x5c;

  if (!certChain) {
    throw new MissingX509CertsError(
      "No certificate chain (x5c) found in the Request Object"
    );
  }

  const validationResults = await Promise.all(
    caRootCerts.map((caRootCert) =>
      verifyCertificateChain(certChain, caRootCert, x509Options)
    )
  );

  const validResult = validationResults.find((result) => result.isValid);

  if (!validResult) {
    for (const result of validationResults) {
      Logger.log(
        LogLevel.ERROR,
        `Certificate chain failure: ${result.validationStatus} - ${result.errorMessage}`
      );
    }
    throw new X509ValidationError("X.509 certificate chain validation failed");
  }

  return validResult;
};
