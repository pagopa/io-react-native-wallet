import type { ISO18013_5 } from "@pagopa/io-react-native-iso18013";

import { cborDecode, cborEncode, DataItem } from "@owf/cose";
import { hasher } from "@owf/crypto";
import { fromUint8Array, toUint8Array } from "js-base64";
import { z } from "zod";

import type { ClaimPath, RequestedCredential } from "../presentation/scope";

export type { ClaimPath };

/** The documents requested by the Verifier, as parsed by `ISO18013_5.parseVerifierRequest` */
export type DeviceRequest = ISO18013_5.VerifierRequest["request"];

export type DocumentRequest = DeviceRequest[string];

/** The document format of the SD-JWT VC requests (ISO/IEC 18013-5 second edition) */
export const SD_JWT_DOC_FORMAT = "dc+sd-jwt";

/** The namespace of the SD-JWT VC requests, whose data elements are mapped to claim paths */
export const SD_JWT_NAMESPACE = "_";

/** Keys of a document request that are not requested namespaces */
const DOCUMENT_REQUEST_METADATA_KEYS = [
  "certificateData",
  "isAuthenticated",
  "isSignatureValid",
  "readerAuth",
  "readerCertificateChain",
  "requestInfo",
];

/**
 * The `requestInfo` of an `ItemsRequest`, as defined by the ISO/IEC 18013-5 second edition
 * (document format and data element mapping) and ETSI TS 119 472-2 clause 5.3.2 (registration certificate).
 */
const RequestInfo = z.object({
  dataElementIdentifierMapping: z
    .record(z.string(), z.array(z.union([z.string(), z.number(), z.null()])))
    .optional(),
  docFormat: z.string().optional(),
  // ETSI TS 119 472-2 spells the label both as `eUWrprc` (CDDL) and `euWrprc` (requirements)
  eUWrprc: z.instanceof(Uint8Array).optional(),
  euWrprc: z.instanceof(Uint8Array).optional(),
});

export type RequestInfo = z.infer<typeof RequestInfo>;

/**
 * Decodes the `requestInfo` of a document request, which the native module forwards as CBOR.
 * @param requestInfo The base64 encoded CBOR of the `requestInfo`
 * @returns The known members of the `requestInfo`, empty when it is missing
 */
export const decodeRequestInfo = (requestInfo?: string): RequestInfo =>
  requestInfo
    ? RequestInfo.parse(
        cborDecode(toUint8Array(requestInfo), { mapsAsObjects: true }),
      )
    : {};

/** The registration certificate of the Verifier, when sent in the `requestInfo` */
export const getRegistrationCertificate = ({ eUWrprc, euWrprc }: RequestInfo) =>
  eUWrprc ?? euWrprc;

/**
 * The namespaces requested in a document request, without the metadata added by the native module.
 * @returns The requested data elements by namespace, with their intent to retain
 */
export const getRequestedNamespaces = (
  documentRequest: DocumentRequest,
): Record<string, Record<string, boolean>> =>
  Object.fromEntries(
    Object.entries(documentRequest).filter(
      (entry): entry is [string, Record<string, boolean>] =>
        !DOCUMENT_REQUEST_METADATA_KEYS.includes(entry[0]),
    ),
  );

/**
 * The claim paths of an SD-JWT VC request: the data elements of the `_` namespace are mapped
 * to claim paths by the `dataElementIdentifierMapping` of the `requestInfo`.
 * @returns The requested claims, with their path and intent to retain
 */
export const getSdJwtRequestedPaths = (
  documentRequest: DocumentRequest,
  { dataElementIdentifierMapping = {} }: RequestInfo,
) =>
  Object.entries(
    getRequestedNamespaces(documentRequest)[SD_JWT_NAMESPACE] ?? {},
  ).map(([name, intentToRetain]) => ({
    intentToRetain,
    name,
    // A data element without mapping is a top level claim, as in multipaz
    path: dataElementIdentifierMapping[name] ?? [name],
  }));

/**
 * The credentials and claims requested in the document requests, to compare them with the
 * scope registered in the WRPRC as in the remote presentation.
 */
export const toRequestedCredentials = (
  request: DeviceRequest,
): RequestedCredential[] =>
  Object.entries(request).map(([docType, documentRequest]) => {
    const requestInfo = decodeRequestInfo(documentRequest.requestInfo);
    return requestInfo.docFormat === SD_JWT_DOC_FORMAT
      ? {
          format: SD_JWT_DOC_FORMAT,
          id: docType,
          paths: getSdJwtRequestedPaths(documentRequest, requestInfo).map(
            ({ path }) => path,
          ),
          types: [docType],
        }
      : {
          format: "mso_mdoc",
          id: docType,
          paths: Object.entries(
            getRequestedNamespaces(documentRequest),
          ).flatMap(([namespace, elements]) =>
            Object.keys(elements).map((name) => [namespace, name]),
          ),
          types: [docType],
        };
  });

/** SHA-256 of a CBOR data item wrapped in a tag 24 (`#6.24(bstr .cbor)`), base64url encoded */
const hashTaggedCbor = (cbor: Uint8Array) =>
  fromUint8Array(
    hasher(cborEncode(DataItem.fromBuffer(cbor)).slice().buffer, "sha256"),
    true,
  );

/**
 * The `nonce` of the Key Binding JWT of an SD-JWT VC presented in proximity:
 * the hash of the `SessionTranscriptBytes`, as in multipaz.
 * @param sessionTranscript The base64 encoded CBOR of the `SessionTranscript`
 */
export const getKeyBindingNonce = (sessionTranscript: string) =>
  hashTaggedCbor(toUint8Array(sessionTranscript));

/**
 * The `aud` of the Key Binding JWT of an SD-JWT VC presented in proximity:
 * the hash of the `ReaderAuth` of the document request, or `none` when the request is not signed, as in multipaz.
 * @param readerAuth The base64 encoded CBOR of the `ReaderAuth`
 */
export const getKeyBindingAudience = (readerAuth?: string) =>
  readerAuth ? hashTaggedCbor(toUint8Array(readerAuth)) : "none";
