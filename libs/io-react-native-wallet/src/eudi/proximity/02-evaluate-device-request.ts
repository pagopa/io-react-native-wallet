import type { ISO18013_5 } from "@pagopa/io-react-native-iso18013";

import type { WalletCredential } from "../presentation/04-evaluate-dcql-query";

import { CredentialsNotFoundError } from "../../credential/presentation/common/errors";
import * as mdocUtils from "../../credential/presentation/common/utils/mdoc";

/** The documents requested by the Verifier, as parsed by `ISO18013_5.parseVerifierRequest` */
export type DeviceRequest = ISO18013_5.VerifierRequest["request"];

export interface EvaluatedDeviceRequest {
  documents: EvaluatedDocumentRequest[];
  /** Whether every document request is signed by a reader certificate that chains to the provided Trust Anchors */
  isVerifierAuthenticated: boolean;
  /** The subject of the reader certificate, when the requests are signed */
  verifier?: DeviceRequest[string]["certificateData"];
}

/** A wallet credential that satisfies a requested document */
export interface EvaluatedDocument {
  /** The raw credential, as issued */
  credential: string;
  docType: string;
  /** Tag of the key the credential is bound to */
  keyTag: string;
  /** The requested data elements, with their values in the credential */
  requestedClaims: RequestedClaim[];
}

/** A document requested by the Verifier, with every wallet credential that satisfies it */
export interface EvaluatedDocumentRequest {
  /** The wallet credentials with the requested docType: the user chooses the one to present */
  candidates: EvaluatedDocument[];
  docType: string;
}

/** A data element requested by the Verifier */
export interface RequestedClaim {
  /** Whether the Verifier intends to retain the data element */
  intentToRetain: boolean;
  name: string;
  namespace: string;
  /** The value in the wallet credential, missing when the credential does not contain the data element */
  value?: unknown;
}

/**
 * Evaluates the documents requested by the Verifier in a proximity presentation (ISO 18013-5)
 * against the wallet credentials. Every `mso_mdoc` credential with the requested docType is
 * returned, e.g. two PIDs, so that the user chooses the one to present. The requested documents
 * not available in the wallet have no candidates, since the Verifier may accept a partial response.
 *
 * @param request The request of the Verifier, received with the `onDocumentRequestReceived` event
 * @param credentials The wallet credentials, in any format: unsupported ones are ignored
 * @returns The requested documents with their candidate credentials, and the Verifier authentication
 * @throws {CredentialsNotFoundError} If the wallet credentials do not satisfy any requested document
 */
export const evaluateDeviceRequest = async (
  request: DeviceRequest,
  credentials: WalletCredential[],
): Promise<EvaluatedDeviceRequest> => {
  const mdocCredentials = await mdocUtils.mapCredentialsToObj(
    credentials
      .filter(({ format }) => format === "mso_mdoc")
      .map(({ credential, keyTag }) => [keyTag, credential]),
  );

  const requestedDocuments = Object.entries(request);

  const documents = requestedDocuments.map(
    ([
      docType,
      { certificateData: _, isAuthenticated: __, ...namespaces },
    ]) => ({
      candidates: mdocCredentials
        .filter((mdoc) => mdoc.doctype === docType)
        .map<EvaluatedDocument>((mdoc) => {
          const [keyTag, credential] = mdoc.original_credential;
          return {
            credential,
            docType,
            keyTag,
            requestedClaims: Object.entries(namespaces).flatMap(
              ([namespace, elements]) =>
                Object.entries(elements).map(([name, intentToRetain]) => ({
                  intentToRetain,
                  name,
                  namespace,
                  value: mdoc.namespaces[namespace]?.[name],
                })),
            ),
          };
        }),
      docType,
    }),
  );

  if (documents.every(({ candidates }) => candidates.length === 0)) {
    throw new CredentialsNotFoundError(
      documents.map(({ docType }) => ({
        doctypeValue: docType,
        format: "mso_mdoc",
        id: docType,
      })),
    );
  }

  return {
    documents,
    isVerifierAuthenticated: requestedDocuments.every(
      ([, { isAuthenticated }]) => isAuthenticated,
    ),
    verifier: requestedDocuments.find(
      ([, { certificateData }]) => certificateData,
    )?.[1].certificateData,
  };
};
