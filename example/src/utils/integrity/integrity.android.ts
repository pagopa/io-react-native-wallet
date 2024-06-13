import { GOOGLE_CLOUD_PROJECT_NUMBER } from "@env";
import { generate, sign } from "@pagopa/io-react-native-crypto";
import {
  isPlayServicesAvailable,
  prepareIntegrityToken,
  requestIntegrityToken,
  getAttestation as getAttestationIntegrity,
} from "@pagopa/io-react-native-integrity";
import { sha256 } from "js-sha256";
import uuid from "react-native-uuid";
import type { HardwareSignatureWithAuthData } from "src/utils/integrity";

/**
 * Generates the hardware backed key for Android.
 * On Adnroid the key is generated via `io-react-native-crypto` instead of `io-react-native-integrity`.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHarwareKeyTag = async () => {
  const keyTag = uuid.v4().toString();
  generate(keyTag).catch((_) => undefined);
  return keyTag;
};

/**
 * Getter for the hardware signature with authenticator data.
 * On Android the implementation uses `io-react-native-crypto` to sign the client data and `io-react-native-integrity` to request the authenticator data,
 * in the form of an integrity token from Google Play Integrity API.
 * @param hardwareKeyTag - the hardware key tag to use for the integrity context, generated via {@link generateIntegrityHarwareKeyTag}.
 * @param clientData - the client data to sign.
 * @returns a promise that resolves with a {@link HardwareSignatureWithAuthData} object containg the signature and the authenticator data or rejects with an error.
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
  if (!res) return false;
  await prepareIntegrityToken(GOOGLE_CLOUD_PROJECT_NUMBER);
  return true;
};

/**
 * Get an hardware attestation on Android.
 * @param nonce - the nonce to use for the attestation.
 * @param hardwareKeyTag - the hardware key tag to use for the attestation.
 */
const getAttestation = async (nonce: string, hardwareKeyTag: string) =>
  await getAttestationIntegrity(nonce, hardwareKeyTag);

export {
  generateIntegrityHarwareKeyTag,
  getHardwareSignatureWithAuthData,
  ensureIntegrityServiceIsReady,
  getAttestation,
};
