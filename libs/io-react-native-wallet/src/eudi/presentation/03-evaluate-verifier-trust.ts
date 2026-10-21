import { ParsedLoTE } from "@pagopa/io-wallet-eudi-trust";
import { REGISTRATION_CERTIFICATE_FORMAT, verifyJwtWithWRPAC, verifyWRPRC } from "../trust/utils";
import { RequestObject } from "./types";
import { ValidationFailed } from "../../utils/errors";

type EvaluateVerifierTrust = (params: {
  requestObjectJwt: string,
  wrpacLote: ParsedLoTE,
  wrprcLote: ParsedLoTE,
}) => Promise<{
  isTrusted: boolean
  error?: { message: string; name: string }
}>

/**
 * Perform trust evaluation based on the access and registration certificates included in the Request Object:
 * - The WRPAC is validated against the provided WRPAC Providers LoTE
 * - The Request Object's signature is verified with the validated WRPAC
 * - The WRPRC is validated against the provided WRPRC Providers LoTE
 *  - (TODO) The Verifier's entitlements are verified
 */
export const evaluateVerifierTrust: EvaluateVerifierTrust = async ({ requestObjectJwt, wrpacLote, wrprcLote }) => {
  try {
    const { payload } = await verifyJwtWithWRPAC({ jwt: requestObjectJwt, wrpacLote })

    const decodedRequestObject = payload as RequestObject // TODO: remove casting

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

    // TODO: check whether WRPAC and WRPRC are linked
    await verifyWRPRC({ wrprcJwt: registrationCertificate.data, wrprcLote });

    // TODO: check Verifier entitlements
    return { isTrusted: true }
  } catch (error) {
    return {
      isTrusted: false,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : {
            message: "Unexpected error during Verifier trust evaluation",
            name: "VerifierTrustEvaluationFailure",
          },
    }
  }
}
