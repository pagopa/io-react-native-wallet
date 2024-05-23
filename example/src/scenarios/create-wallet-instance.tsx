import {
  WalletInstance,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import {
  generateHardwareKey,
  getAttestation,
  isAttestationServiceAvailable,
  isPlayServicesAvailable,
} from "@pagopa/io-react-native-integrity";

import { WALLET_PROVIDER_BASE_URL } from "@env";
import { generate, type CryptoError } from "@pagopa/io-react-native-crypto";
import { Platform } from "react-native";

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

export default async () =>
  Platform.select({
    ios: () => createIos(),
    android: () => createAndroid(),
    default: () => Promise.reject(new Error("Unsupported platform")),
  })();

const createAndroid = async () => {
  try {
    const isPlayServiceAvailable = await isPlayServicesAvailable();
    if (!isPlayServiceAvailable) {
      throw new Error("Play services unavailable");
    }

    const keyTag = `${Math.random()}`;

    await generate(keyTag).catch((e) => {
      if ((e as CryptoError).message !== "KEY_ALREADY_EXISTS") {
        throw e;
      }
    });

    const integrityContext: IntegrityContext = {
      getHardwareKeyTag: () => keyTag,
      getAttestation: (nonce) => getAttestation(nonce, keyTag),
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

const createIos = async () => {
  try {
    const isIntegrityAvailable = await isAttestationServiceAvailable();
    if (!isIntegrityAvailable) {
      throw new Error("Attestation service unavailable");
    }

    const hardwareKeyTag = await generateHardwareKey();

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
