import {
  generateHardwareKey,
  generateHardwareSignatureWithAssertion,
  isAttestationServiceAvailable,
  decodeAssertion,
  getAttestation as getAttestationIntegrity,
} from "@pagopa/io-react-native-integrity";
import type { HardwareSignatureWithAuthData } from "src/utils/integrity";
import { addPadding, removePadding } from "@pagopa/io-react-native-jwt";

/**
 * Generates the hardware backed key for iOS.
 * On iOS the key is generated via `io-react-native-integrity` and it's then converted from a base64 string to a base64url string.
 * A base64 string might not be safe to be stored in a database, so it's converted to a base64url string.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHarwareKeyTag = async () => {
  const base64KeyTag = await generateHardwareKey();
  return removePadding(base64KeyTag);
};

/**
 * Ensures that the integrity servicy is availabe on the device.
 * On iOS it checks if the attestation service is available via `io-react-native-integrity`.
 * @returns a promise with resolves with a boolean value indicating wheter or not the integrity service is available.
 */
const ensureIntegrityServiceIsReady = async () =>
  await isAttestationServiceAvailable();

const getHardwareSignatureWithAuthData = async (
  hardwareKeyTag: string,
  clientData: string
): Promise<HardwareSignatureWithAuthData> => {
  // The generateIntegrityHarwareKeyTag returns a base64url string, so we need to convert it to a base64 string before using it.
  const base64keyTag = addPadding(hardwareKeyTag);
  const assertion = await generateHardwareSignatureWithAssertion(
    clientData,
    base64keyTag
  );
  const decodedAssertion = await decodeAssertion(assertion);
  return decodedAssertion;
};

/**
 * Get an hardware attestation on iOS.
 * @param nonce - the nonce to use for the attestation.
 * @param hardwareKeyTag - the hardware key tag to use for the attestation in base64 format.
 */
const getAttestation = async (nonce: string, hardwareKeyTag: string) => {
  // The generateIntegrityHarwareKeyTag returns a base64url string, so we need to convert it to a base64 string before using it.
  const base64keyTag = addPadding(hardwareKeyTag);
  return await getAttestationIntegrity(nonce, base64keyTag);
};

export {
  generateIntegrityHarwareKeyTag,
  ensureIntegrityServiceIsReady,
  getHardwareSignatureWithAuthData,
  getAttestation,
};
