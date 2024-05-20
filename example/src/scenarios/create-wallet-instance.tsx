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

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

export default async () => {
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
