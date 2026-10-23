import { decode, verify } from "@pagopa/io-react-native-jwt";
import {
  ParsedLoTE,
  validateWRPAC,
  validateWRPRC,
  verifyWRPAuthorization,
  WRP_ENTITLEMENTS,
} from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { trustCallbacks } from "../../trust/callbacks";
import { REGISTRATION_CERTIFICATE_FORMAT } from "../../trust/const";
import { CredentialIssuerMetadata } from "./types";

type EvaluateIssuerTrust = (params: {
  issuerMetadataJwt: string;
  wrpacLote: ParsedLoTE;
  wrprcLote: ParsedLoTE;
}) => Promise<{
  error?: { message: string; name: string };
  isTrusted: boolean;
}>;

/**
 * Perform trust evaluation based on the access and registration certificates included in the Issuer metadata:
 * - The WRPAC is validated against the provided WRPAC Providers LoTE
 * - The Issuer metadata's signature is verified with the validated WRPAC
 * - The WRPRC is validated against the provided WRPRC Providers LoTE
 * - The Issuer's entitlements are verified
 *
 * **Note:** this function DOES NOT perform WRPAC and WRPRC providers LoTE validation.
 *
 * @param issuerMetadataJwt The Issuer metadata in JWT format (must include the WRPAC in `x5c`)
 * @param wrpacLote The WRPAC Providers List of Trusted Entities
 * @param wrprcLote The WRPRC Providers List of Trusted Entities
 * @returns Whether the Issuer is a trusted entity
 */
export const evaluateIssuerTrust: EvaluateIssuerTrust = async ({
  issuerMetadataJwt,
  wrpacLote,
  wrprcLote,
}) => {
  Logger.log(
    LogLevel.DEBUG,
    "Evaluating Issuer's access and registration certificates",
  );

  try {
    const { payload, protectedHeader } = decode(issuerMetadataJwt);

    if (!protectedHeader.x5c) {
      throw new ValidationFailed({
        message: "JWT header is missing x5c with WRPAC",
      });
    }

    Logger.log(
      LogLevel.DEBUG,
      `Validating trust of WRPAC:\n${protectedHeader.x5c[0]}`,
    );

    const { trustAnchor: wrpacTrustAnchor, wrpac } = await validateWRPAC({
      callbacks: trustCallbacks,
      wrpacChain: protectedHeader.x5c as [string, ...string[]],
      wrpacLote,
    });

    Logger.log(LogLevel.DEBUG, `Validated and parsed WRPAC:\n${wrpac}`);
    Logger.log(
      LogLevel.DEBUG,
      `WRPAC validated by Trust Anchor:\n${wrpacTrustAnchor}`,
    );

    // Ensure the Issuer metadata JWT has been signed by a trusted WRPAC
    await verify(issuerMetadataJwt, wrpac.publicJwk);

    const decodedIssuerMetadata = payload as CredentialIssuerMetadata;
    const registrationCertificate = decodedIssuerMetadata.issuer_info?.find(
      ({ format }) => format === REGISTRATION_CERTIFICATE_FORMAT,
    );

    if (!registrationCertificate) {
      throw new ValidationFailed({
        claim: "issuer_info",
        message:
          "The Issuer metadata does not include a registration certificate",
      });
    }

    Logger.log(
      LogLevel.DEBUG,
      `Validating trust of WRPRC:\n${JSON.stringify(registrationCertificate.data)}`,
    );

    const { trustAnchor: wrprcTrustAnchor, wrprc } = await validateWRPRC({
      callbacks: trustCallbacks,
      wrprcJwt: registrationCertificate.data,
      wrprcLote,
    });

    Logger.log(LogLevel.DEBUG, `Validated and parsed WRPRC:\n${wrprc}`);
    Logger.log(
      LogLevel.DEBUG,
      `WRPRC validated by Trust Anchor:\n${wrprcTrustAnchor}`,
    );

    verifyWRPAuthorization({
      entitlements: [
        WRP_ENTITLEMENTS.PID_PROVIDER,
        WRP_ENTITLEMENTS.PUB_EAA_PROVIDER,
        WRP_ENTITLEMENTS.NON_Q_EAA_PROVIDER,
      ],
      wrpac,
      wrprc,
    });

    return { isTrusted: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : {
              message: "Unexpected error during Issuer trust evaluation",
              name: "IssuerTrustEvaluationFailure",
            },
      isTrusted: false,
    };
  }
};
