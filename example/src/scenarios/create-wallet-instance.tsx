import {
  WalletInstance,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import {
  generateHardwareKey,
  getAttestation,
  isAttestationServiceAvailable,
} from "@pagopa/io-react-native-integrity";

import { WALLET_PROVIDER_BASE_URL } from "@env";
import { generate } from "@pagopa/io-react-native-crypto";
import { Platform } from "react-native";

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

export default async () => {
  try {
    const hardwareKeyTag = await Platform.select({
      ios: () => generateKeyIos(),
      android: () => generateKeyAndroid(),
      default: () => Promise.reject(new Error("Unsupported platform")),
    })();

    const integrityContext: IntegrityContext = {
      getHardwareKeyTag: () => hardwareKeyTag,
      getAttestation: (nonce) => getAttestation(nonce, hardwareKeyTag),
    };

    const createdWalletInstance = await WalletInstance.createWalletInstance({
      integrityContext,
      walletProviderBaseUrl,
    });

    console.log(createdWalletInstance);
    return result(createdWalletInstance);
  } catch (e) {
    console.error(e);
    return error(e);
  }
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

/**
 * Generates the hardware backed key for Android.
 * It differents from iOS because the key is generated via `io-react-native-crypto` instead of `io-react-native-integrity`.
 * @returns a promise that resolves with the key tag as string.
 */
const generateKeyAndroid = async () => {
  const keyTag = `${Math.random()}`;
  await generate(keyTag);
  return keyTag;
};
