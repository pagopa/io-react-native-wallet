import {
  WalletInstance,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

import { WALLET_PROVIDER_BASE_URL } from "@env";

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

/**
 * Create a Wallet Instance by providing an integrity context.
 */
export default (integrityContext: IntegrityContext) => async () => {
  try {
    /**
     * Create a Wallet Instance by providing an integrity context.
     * WARNING: The integrity keytag must be persisted and used when creating the Wallet Instance Attestation.
     * This example app uses a non persisted keytag for demonstration purposes only.
     */
    const createdWalletInstance = await WalletInstance.createWalletInstance({
      integrityContext,
      walletProviderBaseUrl,
    });
    return result(createdWalletInstance);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
