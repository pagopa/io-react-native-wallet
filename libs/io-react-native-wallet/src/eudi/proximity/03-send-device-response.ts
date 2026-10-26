import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import { b64utob64 } from "jsrsasign";

import type { EvaluatedDocument } from "./02-evaluate-device-request";

/**
 * Generates the DeviceResponse (ISO 18013-5) with the credentials chosen by the user and sends it
 * to the Verifier over the open proximity session. Every requested data element is disclosed,
 * since the user consents to the whole request.
 *
 * @param documents The credentials to present, one per requested document
 * @throws {ISO18013_5.ModuleError} If the response cannot be generated or sent
 */
export const sendDeviceResponse = async (
  documents: EvaluatedDocument[],
): Promise<void> => {
  const acceptedFields = documents.reduce<ISO18013_5.AcceptedFields>(
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

  const deviceResponse = await ISO18013_5.generateResponse(
    documents.map(({ credential, docType, keyTag }) => ({
      alias: keyTag,
      docType,
      issuerSignedContent: b64utob64(credential),
    })),
    acceptedFields,
  );

  await ISO18013_5.sendResponse(deviceResponse);
};
