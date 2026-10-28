import {
  type ParsedLoTE,
  validateWRPAC,
  validateWRPRC,
  verifyWRPAuthorization,
  WRP_ENTITLEMENTS,
  type WRPRCPayload,
} from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";
import {
  findUnregisteredCredentials,
  type UnregisteredRequest,
} from "../presentation/scope";
import { getX509CertificateMetadata, trustCallbacks } from "../trust/callbacks";
import {
  decodeRequestInfo,
  type DeviceRequest,
  getRegistrationCertificate,
  toRequestedCredentials,
} from "./utils";

/** The Verifier, as stated by the subject of its reader certificate, whether trusted or not */
export interface Reader {
  commonName?: string;
  country?: string;
  organizationName?: string;
}

export interface ReaderTrust {
  /** Why the reader is not trusted */
  error?: { message: string; name: string };
  /** Whether the reader signature, its WRPAC and, when sent, its WRPRC are valid and trusted */
  isTrusted: boolean;
  /** The subject of the reader certificate, missing when the request is not signed */
  reader?: Reader;
  /** The validated WRPRC, missing when the Verifier did not send it */
  registrationCertificate?: WRPRCPayload;
  /** The requested credentials and claims not registered in the WRPRC, when the Verifier is trusted */
  unregisteredRequests?: UnregisteredRequest[];
}

/**
 * A WRPRC in JWT form is ASCII and starts with the base64url of a JSON object, `{"` being `ey`.
 * The CWT form (ETSI TS 119 475 clause 5.2.3) is not supported yet.
 */
const toWrprcJwt = (wrprc: Uint8Array) => {
  const jwt = String.fromCharCode(...wrprc);
  if (!jwt.startsWith("ey")) {
    throw new ValidationFailed({
      message: "Only the JWT form of the registration certificate is supported",
    });
  }
  return jwt;
};

/** Reads the subject of the reader certificate, without validating it, to show who is asking */
const getReader = async (certificate: string): Promise<Reader | undefined> => {
  try {
    const { subject } = await getX509CertificateMetadata(certificate);
    return {
      commonName: subject?.commonName,
      country: subject?.countryName,
      organizationName: subject?.organizationName,
    };
  } catch {
    return undefined;
  }
};

/**
 * Evaluates the trust of the reader of a proximity presentation, like `evaluateVerifierTrust`
 * in the remote presentation, from the reader authentication of every document request
 * (ETSI TS 119 472-2 clause 5.3.2):
 * - the `ReaderAuth` signature is verified by the native module, with the leaf of its `x5chain`;
 * - the `x5chain`, starting with the WRPAC, is validated against the provided WRPAC Providers LoTE;
 * - the WRPRC, when sent in the `requestInfo`, is validated against the provided WRPRC Providers LoTE,
 *   the Verifier's entitlements are verified and the requests are compared with the registered scope:
 *   the unregistered ones do not make the reader untrusted, since the user may still proceed.
 *
 * Every document request must be signed by the same reader.
 *
 * **Note:** this function DOES NOT perform WRPAC and WRPRC providers LoTE validation.
 *
 * @param request The request of the Verifier, received with the `onDocumentRequestReceived` event
 * @param wrpacLote The WRPAC Providers List of Trusted Entities
 * @param wrprcLote The WRPRC Providers List of Trusted Entities
 * @returns Whether the reader is trusted, with the subject of its certificate
 */
export const evaluateReaderTrust = async ({
  request,
  wrpacLote,
  wrprcLote,
}: {
  request: DeviceRequest;
  wrpacLote: ParsedLoTE;
  wrprcLote: ParsedLoTE;
}): Promise<ReaderTrust> => {
  const documentRequests = Object.values(request);
  const [leaf] = documentRequests[0]?.readerCertificateChain ?? [];
  const reader = leaf ? await getReader(leaf) : undefined;

  try {
    const [wrpacChain, ...otherChains] = documentRequests.map(
      ({ isSignatureValid, readerCertificateChain }) => {
        if (!readerCertificateChain?.length) {
          throw new ValidationFailed({
            message: "The document request is not signed by the reader",
          });
        }
        if (!isSignatureValid) {
          throw new ValidationFailed({
            message:
              "The reader signature of the document request is not valid",
          });
        }
        return readerCertificateChain as [string, ...string[]];
      },
    );

    if (!wrpacChain) {
      throw new ValidationFailed({ message: "The request has no documents" });
    }
    if (otherChains.some(([otherLeaf]) => otherLeaf !== wrpacChain[0])) {
      throw new ValidationFailed({
        message: "The document requests are signed by different readers",
      });
    }

    const { trustAnchor: wrpacTrustAnchor, wrpac } = await validateWRPAC({
      callbacks: trustCallbacks,
      wrpacChain,
      wrpacLote,
    });

    Logger.log(
      LogLevel.DEBUG,
      `WRPAC validated by Trust Anchor:\n${wrpacTrustAnchor}`,
    );

    // The same WRPRC is repeated in every document request
    const registrationCertificate = documentRequests
      .map(({ requestInfo }) =>
        getRegistrationCertificate(decodeRequestInfo(requestInfo)),
      )
      .find((wrprc) => wrprc !== undefined);

    if (!registrationCertificate) {
      // Optional in proximity, unlike in the remote presentation (ETSI TS 119 472-2 ISO/IEC 18013-REQ-06)
      Logger.log(LogLevel.DEBUG, "The reader did not send a WRPRC");
      return { isTrusted: true, reader };
    }

    const { trustAnchor: wrprcTrustAnchor, wrprc } = await validateWRPRC({
      callbacks: trustCallbacks,
      wrprcJwt: toWrprcJwt(registrationCertificate),
      wrprcLote,
    });

    Logger.log(
      LogLevel.DEBUG,
      `WRPRC validated by Trust Anchor:\n${wrprcTrustAnchor}`,
    );

    verifyWRPAuthorization({
      entitlements: [WRP_ENTITLEMENTS.SERVICE_PROVIDER],
      wrpac,
      wrprc,
    });

    const unregisteredRequests = findUnregisteredCredentials(
      toRequestedCredentials(request),
      wrprc,
    );

    if (unregisteredRequests.length > 0) {
      Logger.log(
        LogLevel.WARN,
        `The Verifier requests credentials or claims outside its registered scope:\n${JSON.stringify(unregisteredRequests)}`,
      );
    }

    return {
      isTrusted: true,
      reader,
      registrationCertificate: wrprc,
      unregisteredRequests,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : {
              message: "Unexpected error during reader trust evaluation",
              name: "ReaderTrustEvaluationFailure",
            },
      isTrusted: false,
      reader,
    };
  }
};
