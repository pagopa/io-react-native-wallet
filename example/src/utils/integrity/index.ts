import { Platform } from "react-native";
import {
  ensureIntegrityServiceAndroid,
  generateIntegrityKeyAndroid,
  getHardwareSignatureWithAuthDataAndroid,
} from "./integrityAndroid";
import {
  ensureIntegrityServiceIos,
  generateIntegrityKeyIos,
} from "./integrityIos";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";
import { getAttestation } from "@pagopa/io-react-native-integrity";
import type { HardwareSignatureWithAuthData } from "src/utils/integrity";

/**
 * Generates the hardware signature with the authentication data. The implementation differs between iOS and Android.
 * This will later be used to verify the signature on the server side.
 * @param hardwareKeyTag - the hardware key tag to use for the signature.
 * @returns a function that takes the client data as string and returns a promise that resolves with the signature and the authenticator data or rejects with an error.
 */
const getHardwareSignatureWithAuthData =
  (hardwareKeyTag: string) =>
  async (clientData: string): Promise<HardwareSignatureWithAuthData> =>
    Platform.select({
      ios: () => {
        // Needs local assertion decoding function from io-react-native-integrity
        //const res = generateHardwareSignatureWithAssertion(clientData, hardwareKeyTag)
        // return decodeAssertion(res)
        return Promise.reject(new Error("Unsupported platform"));
      },
      android: () =>
        getHardwareSignatureWithAuthDataAndroid(hardwareKeyTag, clientData),
      default: () => {
        return Promise.reject(new Error("Unsupported platform"));
      },
    })();

/**
 * Generates the hardware backed key for the current platform. iOS or Android are supported.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHarwareKeyTag = () =>
  Platform.select({
    ios: () => generateIntegrityKeyIos(),
    android: () => generateIntegrityKeyAndroid(),
    default: () => {
      return Promise.reject(new Error("Unsupported platform"));
    },
  })();

/**
 * Ensures the integrity service is ready on the device.
 * @returns a promise with resolves with a boolean value indicating wheter or not the integrity service is available.
 */
const ensureIntegrityServicyIsReady = () =>
  Platform.select({
    ios: () => ensureIntegrityServiceIos(),
    android: () => ensureIntegrityServiceAndroid(),
    default: () => {
      return Promise.reject("Unsupported platform");
    },
  })();

/**
 * Getter for platform specific {@link IntegrityContext}.
 * {@link ensureIntegrityServicyIsReady} and {@link generateIntegrityHarwareKeyTag} must be called before this function.
 * @param hardwareKeyTag - the hardware key tag to use for the integrity context, generated via {@link generateIntegrityHarwareKeyTag}.
 * @returns a promise that resolves with the integrity context or rejects with an error.
 */
const getIntegrityContext = async (
  hardwareKeyTag: string
): Promise<IntegrityContext> => {
  return {
    getHardwareKeyTag: () => hardwareKeyTag,
    getAttestation: (nonce: string) => getAttestation(nonce, hardwareKeyTag),
    getHardwareSignatureWithAuthData:
      getHardwareSignatureWithAuthData(hardwareKeyTag),
  };
};

export const integrityUtils = {
  ensureIntegrityServicyIsReady,
  generateIntegrityHarwareKeyTag,
  getIntegrityContext,
};
