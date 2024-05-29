import {
  generateHardwareKey,
  isAttestationServiceAvailable,
} from "@pagopa/io-react-native-integrity";

/**
 * Generates the hardware backed key for iOS.
 * It differents from Android because the key is generated via `io-react-native-integrity` instead of `io-react-native-crypto`.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityKeyIos = async () => await generateHardwareKey();

/**
 * Ensures that the integrity servicy is availabe on the device.
 * @returns a promise with resolves with a boolean value indicating wheter or not the integrity service is available.
 */
const ensureIntegrityServiceIos = async () =>
  await isAttestationServiceAvailable();

export { generateIntegrityKeyIos, ensureIntegrityServiceIos };
