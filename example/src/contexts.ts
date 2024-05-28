import { GOOGLE_CLOUD_PROJECT_NUMBER } from "@env";
import { generate, getPublicKey, sign } from "@pagopa/io-react-native-crypto";
import {
  generateHardwareKey,
  getAttestation,
  isAttestationServiceAvailable,
  prepareIntegrityToken,
  requestIntegrityToken,
} from "@pagopa/io-react-native-integrity";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";
import { sha256 } from "js-sha256";
import { Platform } from "react-native";
import { fixBase64EncodingOnKey } from "@pagopa/io-react-native-wallet";
import uuid from "react-native-uuid";

/**
 * Generates the hardware backed key for Android.
 * It differents from iOS because the key is generated via `io-react-native-crypto` instead of `io-react-native-integrity`.
 * @returns a promise that resolves with the key tag as string.
 */
const generateKeyAndroid = async () => {
  const keyTag = uuid.v4().toString();
  generate(keyTag).catch((_) => undefined);
  return keyTag;
};

/**
 * Generates the hardware backed key for iOS.
 * It differents from Android because the key is generated via `io-react-native-integrity` instead of `io-react-native-crypto`.
 * There's also a check for the availability of the attestation service.
 * @returns a promise that resolves with the key tag as string.
 */
const generateKeyIos = async () => {
  const isIntegrityAvailable = await isAttestationServiceAvailable();
  if (!isIntegrityAvailable) {
    throw new Error("Attestation service unavailable");
  }

  return await generateHardwareKey();
};

const getHardwareSignatureWithAuthData =
  (hardwareKeyTag: string) => async (clientData: string) =>
    await Platform.select({
      ios: () => {
        //const res = generateHardwareSignatureWithAssertion(clientData, hardwareKeyTag)
        // return decodeAssertion(res)
        return Promise.resolve({ signature: "", authenticatorData: "" });
      },
      android: async () => {
        // Maybe hash clientData before signing
        const signature = await sign(clientData, hardwareKeyTag);
        await prepareIntegrityToken(GOOGLE_CLOUD_PROJECT_NUMBER);

        console.log("hardwareKeyTag", hardwareKeyTag);
        console.log("clientData", clientData);

        const clientDataHash = sha256(clientData);
        console.log("clientDataHash", clientDataHash);

        const authenticatorData = await requestIntegrityToken(clientDataHash);

        return Promise.resolve({ signature, authenticatorData });
      },
      default: () => Promise.reject(new Error("Unsupported platform")),
    })();

export const getIntegrityContext = (
  hardwareKeyTag: string
): IntegrityContext => ({
  getHardwareKeyTag: () => hardwareKeyTag,
  getAttestation: (nonce: string) => getAttestation(nonce, hardwareKeyTag),
  getHardwareSignatureWithAuthData:
    getHardwareSignatureWithAuthData(hardwareKeyTag),
  getHardwarePublicKey: getHardwarePublicKey(hardwareKeyTag),
});

export const generateHarwareKeyTag = () =>
  Platform.select({
    ios: () => generateKeyIos(),
    android: () => generateKeyAndroid(),
    default: () => Promise.reject(new Error("Unsupported platform")),
  })();

// it's not needed anymore
const getHardwarePublicKey = (keyTag: string) =>
  Platform.select({
    ios: () => Promise.reject(new Error("Unsupported platform")),
    android: () =>
      getPublicKey(keyTag).then((key) => fixBase64EncodingOnKey(key)),
    default: () => Promise.reject(new Error("Unsupported platform")),
  });
