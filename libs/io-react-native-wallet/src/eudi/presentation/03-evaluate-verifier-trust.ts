import { decode, verify } from "@pagopa/io-react-native-jwt";
import {
  ParsedLoTE,
  validateWRPAC,
  validateWRPRC,
  verifyWRPAuthorization,
  WRP_ENTITLEMENTS,
} from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";
import { trustCallbacks } from "../trust/callbacks";
import { REGISTRATION_CERTIFICATE_FORMAT } from "../trust/const";
import { findUnregisteredRequests, type UnregisteredRequest } from "./scope";
import { RequestObject } from "./types";

type EvaluateVerifierTrust = (params: {
  requestObjectJwt: string;
  wrpacLote: ParsedLoTE;
  wrprcLote: ParsedLoTE;
}) => Promise<{
  error?: { message: string; name: string };
  isTrusted: boolean;
  /** The requested credentials and claims not registered in the WRPRC, when the Verifier is trusted */
  unregisteredRequests?: UnregisteredRequest[];
}>;

/**
 * Perform trust evaluation based on the access and registration certificates included in the Request Object:
 * - The WRPAC is validated against the provided WRPAC Providers LoTE
 * - The Request Object's signature is verified with the validated WRPAC
 * - The WRPRC is validated against the provided WRPRC Providers LoTE
 * - The Verifier's entitlements are verified
 * - The credentials and claims requested in the DCQL query are compared with the scope registered in the WRPRC:
 *   the unregistered ones do not make the Verifier untrusted, since the user may still proceed
 *
 * **Note:** this function DOES NOT perform WRPAC and WRPRC providers LoTE validation.
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
  Logger.log(
    LogLevel.DEBUG,
    "Evaluating Verifier's access and registration certificates",
  );

  try {
    const { payload, protectedHeader } = decode(requestObjectJwt);

    if (!protectedHeader.x5c) {
      throw new ValidationFailed({
        message: "JWT header is missing x5c with WRPAC",
      });
    }

    Logger.log(
      LogLevel.DEBUG,
      `Validating trust of WRPAC:\n${JSON.stringify(protectedHeader.x5c[0])}`,
    );

    const { trustAnchor: wrpacTrustAnchor, wrpac } = await validateWRPAC({
      callbacks: trustCallbacks,
      wrpacChain: protectedHeader.x5c as [string, ...string[]],
      wrpacLote,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Validated and parsed WRPAC:\n${JSON.stringify(wrpac)}`,
    );
    Logger.log(
      LogLevel.DEBUG,
      `WRPAC validated by Trust Anchor:\n${wrpacTrustAnchor}`,
    );

    // Ensure the Request Object JWT has been signed by a trusted WRPAC
    await verify(requestObjectJwt, wrpac.publicJwk);

    const decodedRequestObject = payload as RequestObject;
    const registrationCertificate = decodedRequestObject.verifier_info?.find(
      (info): info is typeof info & { data: string } =>
        info.format === REGISTRATION_CERTIFICATE_FORMAT &&
        typeof info.data === "string",
    );

    if (!registrationCertificate) {
      throw new ValidationFailed({
        claim: "verifier_info",
        message:
          "The Request Object does not include a registration certificate",
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
      entitlements: [WRP_ENTITLEMENTS.SERVICE_PROVIDER],
      wrpac,
      wrprc,
    });

    const unregisteredRequests = findUnregisteredRequests(
      decodedRequestObject.dcql_query,
      wrprc,
    );

    if (unregisteredRequests.length > 0) {
      Logger.log(
        LogLevel.WARN,
        `The Verifier requests credentials or claims outside its registered scope:\n${JSON.stringify(unregisteredRequests)}`,
      );
    }

    return { isTrusted: true, unregisteredRequests };
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
