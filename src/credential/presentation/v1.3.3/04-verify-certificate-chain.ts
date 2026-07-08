import type { RemotePresentationApi } from "../api";
import { decode } from "@pagopa/io-react-native-jwt";
import {
  verifyCertificateChain,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import {
  MissingX509CertsError,
  X509ValidationError,
} from "../../../trust/common/errors";
import { Logger, LogLevel } from "../../../utils/logging";

export const verifyAuthRequestCertificateChain: RemotePresentationApi["verifyAuthRequestCertificateChain"] =
  async (requestObjectJwt, { caRootCert }) => {
    const x509Options: X509CertificateOptions = {
      requireCrl: false,
      connectTimeout: 10_000,
      readTimeout: 10_000,
    };

    const requestObject = decode(requestObjectJwt);

    const x5c = requestObject.protectedHeader.x5c;

    if (!x5c) {
      throw new MissingX509CertsError(
        "No certificate chain (x5c) found in the Request Object"
      );
    }

    // The native validator expects the chain to include the leaf and any
    // intermediates, excluding the trust anchor (supplied separately as
    // `caRootCert`). Some RPs include the anchor as the last entry of x5c,
    // which must be stripped or the native validator (notably on iOS) treats
    // it as an extraneous/unexpected trailing certificate and fails.
    const certChain =
      x5c.length > 1 && x5c.at(-1) === caRootCert ? x5c.slice(0, -1) : x5c;

    const validationResult = await verifyCertificateChain(
      certChain,
      caRootCert,
      x509Options
    );

    if (!validationResult.isValid) {
      Logger.log(
        LogLevel.ERROR,
        `Certificate chain failure: ${validationResult.validationStatus} - ${validationResult.errorMessage}`
      );

      throw new X509ValidationError(
        `X.509 certificate chain validation failed. Status: ${validationResult.validationStatus}. Error: ${validationResult.errorMessage}`
      );
    }

    return validationResult;
  };
