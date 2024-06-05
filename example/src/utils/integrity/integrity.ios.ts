import {
  generateHardwareKey,
  generateHardwareSignatureWithAssertion,
  isAttestationServiceAvailable,
  decodeAssertion,
} from "@pagopa/io-react-native-integrity";
import type { HardwareSignatureWithAuthData } from "src/utils/integrity";

/**
 * Generates the hardware backed key for iOS.
 * It differents from Android because the key is generated via `io-react-native-integrity` instead of `io-react-native-crypto`.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHarwareKeyTag = async () => await generateHardwareKey();

/**
 * Ensures that the integrity servicy is availabe on the device.
 * @returns a promise with resolves with a boolean value indicating wheter or not the integrity service is available.
 */
const ensureIntegrityServiceIsReady = async () =>
  await isAttestationServiceAvailable();

const getHardwareSignatureWithAuthData = async (
  hardwareKeyTag: string,
  clientData: string
): Promise<HardwareSignatureWithAuthData> => {
  const assertion = await generateHardwareSignatureWithAssertion(
    clientData,
    hardwareKeyTag
  );
  const decodedAssertion = await decodeAssertion(assertion);
  return Promise.resolve(decodedAssertion);
};

export {
  generateIntegrityHarwareKeyTag,
  ensureIntegrityServiceIsReady,
  getHardwareSignatureWithAuthData,
};
