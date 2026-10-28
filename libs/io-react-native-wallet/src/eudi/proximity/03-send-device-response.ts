import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import { fromUint8Array } from "js-base64";
import { b64utob64 } from "jsrsasign";
import { deflate } from "pako";

import type { PresentationFrame } from "../../credential/presentation/api/types";
import type { EvaluatedDocument } from "./02-evaluate-device-request";

import { pathToPresentationFrame } from "../../credential/presentation/common/utils/dcql";
import { prepareVpToken } from "../../sd-jwt";
import { createCryptoContextFor } from "../../utils/crypto";
import {
  type ClaimPath,
  getKeyBindingAudience,
  getKeyBindingNonce,
  SD_JWT_DOC_FORMAT,
} from "./utils";

type SdJwtDocument = Extract<EvaluatedDocument, { format: "dc+sd-jwt" }>;

/** Nests the value of a claim under its path, up to the first array selector, as the DCQL output */
const toClaimOutput = (
  path: ClaimPath,
  value: unknown,
): Record<string, unknown> => {
  const arrayIndex = path.indexOf(null);
  const [first, ...rest] = (
    arrayIndex < 0 ? path : path.slice(0, arrayIndex)
  ).filter((key) => key !== null);
  if (first === undefined) return {};
  return {
    [first]: rest.reduceRight<unknown>((acc, key) => ({ [key]: acc }), value),
  };
};

const mergeFrames = (
  target: PresentationFrame,
  source: PresentationFrame,
): PresentationFrame =>
  Object.entries(source).reduce<PresentationFrame>(
    (acc, [key, value]) => {
      const current = acc[key];
      acc[key] =
        typeof value === "object" && typeof current === "object"
          ? mergeFrames(current, value)
          : value;
      return acc;
    },
    { ...target },
  );

/** The presentation frame disclosing every requested claim available in the credential */
const getPresentationFrame = ({ requestedClaims }: SdJwtDocument) =>
  requestedClaims
    .filter(({ path, value }) => path && value !== undefined)
    .reduce<PresentationFrame>(
      (frame, { path = [], value }) =>
        mergeFrames(
          frame,
          pathToPresentationFrame(path, toClaimOutput(path, value)),
        ),
      {},
    );

/**
 * Presents an SD-JWT VC in proximity (ISO/IEC 18013-5 second edition): the Key Binding JWT
 * is bound to the session by its `nonce` and to the document request by its `aud`, and the
 * SD-JWT VC is compressed with zlib in the `otherDocuments` of the DeviceResponse.
 */
const toOtherDocument = async (
  document: SdJwtDocument,
  sessionTranscript: string,
): Promise<ISO18013_5.OtherDocument> => {
  const { vp_token } = await prepareVpToken(
    getKeyBindingNonce(sessionTranscript),
    getKeyBindingAudience(document.readerAuth),
    [
      document.credential,
      getPresentationFrame(document),
      createCryptoContextFor(document.keyTag),
    ],
  );
  return {
    data: fromUint8Array(deflate(vp_token)),
    docFormat: SD_JWT_DOC_FORMAT,
  };
};

/**
 * Generates the DeviceResponse (ISO 18013-5) with the credentials chosen by the user and sends it
 * to the Verifier over the open proximity session. Every requested data element is disclosed,
 * since the user consents to the whole request:
 * - `mso_mdoc` credentials are presented in the `documents` of the response;
 * - SD-JWT VC credentials are presented in the `otherDocuments` of the response (ISO/IEC 18013-5 second edition).
 *
 * @param documents The credentials to present, one per requested document
 * @param sessionTranscript The `sessionTranscript` of the `onDocumentRequestReceived` event, required for SD-JWT VC credentials
 * @throws {ISO18013_5.ModuleError} If the response cannot be generated or sent
 * @throws {Error} If an SD-JWT VC credential is presented without the `sessionTranscript`
 */
export const sendDeviceResponse = async (
  documents: EvaluatedDocument[],
  sessionTranscript?: string,
): Promise<void> => {
  const mdocDocuments = documents.filter(
    (document) => document.format === "mso_mdoc",
  );
  const sdJwtDocuments = documents.filter(
    (document): document is SdJwtDocument =>
      document.format === SD_JWT_DOC_FORMAT,
  );

  if (sdJwtDocuments.length > 0 && !sessionTranscript) {
    throw new Error(
      "The session transcript is required to present SD-JWT VC credentials",
    );
  }

  const acceptedFields = mdocDocuments.reduce<ISO18013_5.AcceptedFields>(
    (acc, { docType, requestedClaims }) => ({
      ...acc,
      [docType]: requestedClaims.reduce<ISO18013_5.AcceptedFields[string]>(
        (namespaces, { name, namespace }) => ({
          ...namespaces,
          [namespace]: { ...namespaces[namespace], [name]: true },
        }),
        {},
      ),
    }),
    {},
  );

  const otherDocuments = sessionTranscript
    ? await Promise.all(
        sdJwtDocuments.map((document) =>
          toOtherDocument(document, sessionTranscript),
        ),
      )
    : [];

  const deviceResponse = await ISO18013_5.generateResponse(
    mdocDocuments.map(({ credential, docType, keyTag }) => ({
      alias: keyTag,
      docType,
      issuerSignedContent: b64utob64(credential),
    })),
    acceptedFields,
    otherDocuments,
  );

  await ISO18013_5.sendResponse(deviceResponse);
};
