import {
  ParsedLoTE,
  verifyWRPAuthorization,
  WRP_ENTITLEMENTS,
} from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../../utils/errors";
import {
  REGISTRATION_CERTIFICATE_FORMAT,
  verifyJwtWithWRPAC,
  verifyWRPRC,
} from "../../trust/utils";
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
 *  - (TODO) The Issuer's entitlements are verified
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
  try {
    const { payload, wrpac } = await verifyJwtWithWRPAC({
      jwt: issuerMetadataJwt,
      wrpacLote,
    });

    const decodedIssuerMetadata = payload as CredentialIssuerMetadata; // TODO: remove casting

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

    const { wrprc } = await verifyWRPRC({
      wrprcJwt: registrationCertificate.data,
      wrprcLote,
    });
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
