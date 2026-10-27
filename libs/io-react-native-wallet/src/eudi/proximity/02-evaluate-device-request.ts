import type { WalletCredential } from "../presentation/04-evaluate-dcql-query";

import { CredentialsNotFoundError } from "../../credential/presentation/common/errors";
import * as mdocUtils from "../../credential/presentation/common/utils/mdoc";
import * as sdJwtUtils from "../../credential/presentation/common/utils/sd-jwt";
import {
  type ClaimPath,
  decodeRequestInfo,
  type DeviceRequest,
  getRequestedNamespaces,
  getSdJwtRequestedPaths,
  SD_JWT_DOC_FORMAT,
  SD_JWT_NAMESPACE,
} from "./utils";

/** A wallet credential that satisfies a requested document */
export type EvaluatedDocument = {
  /** The raw credential, as issued */
  credential: string;
  docType: string;
  /** Tag of the key the credential is bound to */
  keyTag: string;
  /** The requested data elements, with their values in the credential */
  requestedClaims: RequestedClaim[];
} & (
  | { format: "mso_mdoc" }
  | {
      format: typeof SD_JWT_DOC_FORMAT;
      /** The `ReaderAuth` of the document request, which the Key Binding JWT is bound to */
      readerAuth?: string;
    }
);

/** A document requested by the Verifier, with every wallet credential that satisfies it */
export interface EvaluatedDocumentRequest {
  /** The wallet credentials with the requested docType or vct: the user chooses the one to present */
  candidates: EvaluatedDocument[];
  /** The requested docType, or the vct of an SD-JWT VC */
  docType: string;
  format: EvaluatedDocument["format"];
}

/** A data element requested by the Verifier */
export interface RequestedClaim {
  /** Whether the Verifier intends to retain the data element */
  intentToRetain: boolean;
  name: string;
  namespace: string;
  /** The claim path of an SD-JWT VC data element */
  path?: ClaimPath;
  /** The value in the wallet credential, missing when the credential does not contain the data element */
  value?: unknown;
}

const SD_JWT_FORMATS = ["dc+sd-jwt", "vc+sd-jwt"];

/** Reads the value of a claim path, `null` selecting every element of an array (OpenID4VP 1.0, Section 7) */
const getValueAtPath = (value: unknown, path: ClaimPath): unknown => {
  const [segment, ...rest] = path;
  if (segment === undefined) return value;
  if (segment === null) {
    return Array.isArray(value)
      ? value.map((element) => getValueAtPath(element, rest))
      : undefined;
  }
  if (value === null || typeof value !== "object") return undefined;
  return getValueAtPath((value as Record<string, unknown>)[segment], rest);
};

/**
 * Evaluates the documents requested by the Verifier in a proximity presentation (ISO 18013-5)
 * against the wallet credentials:
 * - `mso_mdoc` requests are satisfied by the credentials with the requested docType;
 * - SD-JWT VC requests (ISO/IEC 18013-5 second edition, `docFormat` `dc+sd-jwt` in the `requestInfo`)
 *   are satisfied by the credentials with the requested vct, the data elements being mapped to claim paths.
 *
 * Every satisfying credential is returned, e.g. two PIDs, so that the user chooses the one to present.
 * The requested documents not available in the wallet have no candidates, and the requested data
 * elements missing in a credential have no value, since the Verifier may accept a partial response.
 *
 * @param request The request of the Verifier, received with the `onDocumentRequestReceived` event
 * @param credentials The wallet credentials, in any format: unsupported ones are ignored
 * @returns The requested documents with their candidate credentials
 * @throws {CredentialsNotFoundError} If the wallet credentials do not satisfy any requested document
 */
export const evaluateDeviceRequest = async (
  request: DeviceRequest,
  credentials: WalletCredential[],
): Promise<EvaluatedDocumentRequest[]> => {
  const [mdocCredentials, sdJwtCredentials] = await Promise.all([
    mdocUtils.mapCredentialsToObj(
      credentials
        .filter(({ format }) => format === "mso_mdoc")
        .map(({ credential, keyTag }) => [keyTag, credential]),
    ),
    sdJwtUtils.mapCredentialsToObj(
      credentials
        .filter(({ format }) => SD_JWT_FORMATS.includes(format))
        .map(({ credential, keyTag }) => [keyTag, credential]),
    ),
  ]);

  const documents = Object.entries(request).map(
    ([docType, documentRequest]): EvaluatedDocumentRequest => {
      const requestInfo = decodeRequestInfo(documentRequest.requestInfo);

      if (requestInfo.docFormat === SD_JWT_DOC_FORMAT) {
        const requestedPaths = getSdJwtRequestedPaths(
          documentRequest,
          requestInfo,
        );
        return {
          candidates: sdJwtCredentials
            .filter(({ vct }) => vct === docType)
            .map(({ claims, original_credential: [keyTag, credential] }) => ({
              credential,
              docType,
              format: SD_JWT_DOC_FORMAT,
              keyTag,
              readerAuth: documentRequest.readerAuth,
              requestedClaims: requestedPaths.map(
                ({ intentToRetain, name, path }) => ({
                  intentToRetain,
                  name,
                  namespace: SD_JWT_NAMESPACE,
                  path,
                  value: getValueAtPath(claims, path),
                }),
              ),
            })),
          docType,
          format: SD_JWT_DOC_FORMAT,
        };
      }

      const namespaces = getRequestedNamespaces(documentRequest);
      return {
        candidates: mdocCredentials
          .filter((mdoc) => mdoc.doctype === docType)
          .map((mdoc) => {
            const [keyTag, credential] = mdoc.original_credential;
            return {
              credential,
              docType,
              format: "mso_mdoc",
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
        format: "mso_mdoc",
      };
    },
  );

  if (documents.every(({ candidates }) => candidates.length === 0)) {
    throw new CredentialsNotFoundError(
      documents.map(({ docType, format }) =>
        format === SD_JWT_DOC_FORMAT
          ? { format, id: docType, vctValues: [docType] }
          : { doctypeValue: docType, format, id: docType },
      ),
    );
  }

  return documents;
};
