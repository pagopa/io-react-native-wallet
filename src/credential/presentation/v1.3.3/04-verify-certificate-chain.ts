import type { RemotePresentationApi } from "../api";
import { decode } from "@pagopa/io-react-native-jwt";
import {
  verifyCertificateChain,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import {
  MissingX509CertsError,
  X509ValidationError,
} from "src/trust/common/errors";
import { Logger, LogLevel } from "src/utils/logging";

export const verifyAuthRequestCertificateChain: RemotePresentationApi["verifyAuthRequestCertificateChain"] =
  async (requestObjectJwt, { caRootCerts }) => {
    const x509Options: X509CertificateOptions = {
      requireCrl: false,
      connectTimeout: 10_000,
      readTimeout: 10_000,
    };

    const requestObject = decode(requestObjectJwt);

    const certChain = requestObject.protectedHeader.x5c;

    if (!certChain) {
      throw new MissingX509CertsError(
        "No certificate chain (x5c) found in the Request Object",
      );
    }

    const validationResult = await verifyCertificateChain(
      certChain,
      caRootCerts,
      x509Options,
    );

    if (!validationResult.isValid) {
      Logger.log(
        LogLevel.ERROR,
        `Certificate chain failure: ${validationResult.validationStatus} - ${validationResult.errorMessage}`,
      );

      throw new X509ValidationError(
        "X.509 certificate chain validation failed",
      );
    }

    return validationResult;
  };
