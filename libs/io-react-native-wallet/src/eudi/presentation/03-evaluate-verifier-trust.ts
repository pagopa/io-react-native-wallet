import {
  ParsedLoTE,
  verifyWRPAuthorization,
  WRP_ENTITLEMENTS,
} from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../utils/errors";
import {
  REGISTRATION_CERTIFICATE_FORMAT,
  verifyJwtWithWRPAC,
  verifyWRPRC,
} from "../trust/utils";
import { RequestObject } from "./types";

type EvaluateVerifierTrust = (params: {
  requestObjectJwt: string;
  wrpacLote: ParsedLoTE;
  wrprcLote: ParsedLoTE;
}) => Promise<{
  error?: { message: string; name: string };
  isTrusted: boolean;
}>;

/**
 * Perform trust evaluation based on the access and registration certificates included in the Request Object:
 * - The WRPAC is validated against the provided WRPAC Providers LoTE
 * - The Request Object's signature is verified with the validated WRPAC
 * - The WRPRC is validated against the provided WRPRC Providers LoTE
 *  - (TODO) The Verifier's entitlements are verified
 *
 * @param requestObjectJwt The Request Object in JWT format (must include the WRPAC in `x5c`)
 * @param wrpacLote The WRPAC Providers List of Trusted Entities
 * @param wrprcLote The WRPRC Providers List of Trusted Entities
 * @returns Whether the Verifier is a trusted entity
 */
export const evaluateVerifierTrust: EvaluateVerifierTrust = async ({
  requestObjectJwt,
  wrpacLote,
  wrprcLote,
}) => {
  try {
    const { payload, wrpac } = await verifyJwtWithWRPAC({
      jwt: requestObjectJwt,
      wrpacLote,
    });

    const decodedRequestObject = payload as RequestObject; // TODO: remove casting

    const registrationCertificate = decodedRequestObject.verifier_info?.find(
      ({ format }) => format === REGISTRATION_CERTIFICATE_FORMAT,
    );

    if (!registrationCertificate) {
      throw new ValidationFailed({
        claim: "verifier_info",
        message:
          "The Request Object does not include a registration certificate",
      });
    }

    const { wrprc } = await verifyWRPRC({
      wrprcJwt: registrationCertificate.data,
      wrprcLote,
    });
    verifyWRPAuthorization({
      entitlements: [WRP_ENTITLEMENTS.SERVICE_PROVIDER],
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
              message: "Unexpected error during Verifier trust evaluation",
              name: "VerifierTrustEvaluationFailure",
            },
      isTrusted: false,
    };
  }
};
