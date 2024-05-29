import { GOOGLE_CLOUD_PROJECT_NUMBER } from "@env";
import { generate, sign } from "@pagopa/io-react-native-crypto";
import {
  isPlayServicesAvailable,
  prepareIntegrityToken,
  requestIntegrityToken,
} from "@pagopa/io-react-native-integrity";
import { sha256 } from "js-sha256";
import uuid from "react-native-uuid";
import type { HardwareSignatureWithAuthData } from "src/utils/integrity";

/**
 * Generates the hardware backed key for Android.
 * It differents from iOS because the key is generated via `io-react-native-crypto` instead of `io-react-native-integrity`.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHarwareKeyTag = async () => {
  const keyTag = uuid.v4().toString();
  generate(keyTag).catch((_) => undefined);
  return keyTag;
};

/**
 * Getter
 * @param hardwareKeyTag
 * @param clientData
 * @returns
 */
const getHardwareSignatureWithAuthData = async (
  hardwareKeyTag: string,
  clientData: string
): Promise<HardwareSignatureWithAuthData> => {
  const signature = await sign(clientData, hardwareKeyTag);
  const clientDataHash = sha256(clientData);
  const authenticatorData = await requestIntegrityToken(clientDataHash);
  return { signature, authenticatorData };
};

/**
 * Ensures that the integrity servicy is availabe and ready.
 * It checks if the play services are available via `io-react-native-integrity` and prepares the integrity token.
 * @returns a promise with resolves with a boolean value indicating wheter or not the integrity service is available.
 */
const ensureIntegrityServiceIsReady = async () => {
  const res = await isPlayServicesAvailable();
  if (!res) return Promise.reject(false);
  await prepareIntegrityToken(GOOGLE_CLOUD_PROJECT_NUMBER);
  return Promise.resolve(true);
};

export {
  generateIntegrityHarwareKeyTag,
  getHardwareSignatureWithAuthData,
  ensureIntegrityServiceIsReady,
};
